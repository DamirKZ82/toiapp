"""
Авторизация по номеру телефона:

    POST /auth/request-otp         { phone }
    POST /auth/verify-otp          { phone, code }
    POST /auth/complete-profile    { full_name, language }   (требует токен)
    POST /auth/fcm-token           { token }                 (требует токен)

Поток:
    1. request-otp  -> создаём запись в otp_codes, шлём SMS (мок).
    2. verify-otp   -> валидируем, создаём юзера если новый, выдаём JWT.
    3. complete-profile -> заполняем ФИО и язык (для новых юзеров).
    4. fcm-token    -> сохраняем токен устройства для пушей.
"""
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, field_validator

from config import config
from connections.connect_postgres import query_db
from handlers.h01_errors import WarnException
from handlers.h03_auth import auth_user
from libs.auth import issue_token
from libs.common import fit_to_sql, new_guid
from libs.date import get_timestamp_now, add_minutes
from libs.phone import normalize_phone
from libs.sms import send_otp


router = APIRouter(prefix='/auth')


# -------------------------------------------------------------------------
# Pydantic модели
# -------------------------------------------------------------------------

class RequestOtpBody(BaseModel):
    phone: str


class VerifyOtpBody(BaseModel):
    phone: str
    code: str

    @field_validator('code')
    @classmethod
    def code_format(cls, val):
        val = (val or '').strip()
        if len(val) != 4 or not val.isdigit():
            raise ValueError('Код должен состоять из 4 цифр')
        return val


class CompleteProfileBody(BaseModel):
    full_name: str
    language: str = 'ru'

    @field_validator('full_name')
    @classmethod
    def full_name_not_empty(cls, val):
        val = (val or '').strip()
        if not val:
            raise ValueError('ФИО не может быть пустым')
        if len(val) > 200:
            raise ValueError('ФИО не должно быть длиннее 200 символов')
        return val

    @field_validator('language')
    @classmethod
    def language_valid(cls, val):
        val = (val or '').strip().lower()
        if val not in ('ru', 'kz'):
            raise ValueError("Язык должен быть 'ru' или 'kz'")
        return val


class FcmTokenBody(BaseModel):
    token: str

    @field_validator('token')
    @classmethod
    def token_not_empty(cls, val):
        val = (val or '').strip()
        if not val:
            raise ValueError('FCM-токен не может быть пустым')
        if len(val) > 500:
            raise ValueError('FCM-токен слишком длинный')
        return val


# -------------------------------------------------------------------------
# Хелперы
# -------------------------------------------------------------------------

async def _user_by_phone(phone: str) -> Optional[dict]:
    rows = await query_db(f"""
        SELECT id, guid, phone, full_name, language, fcm_token, is_blocked
        FROM users
        WHERE phone = {fit_to_sql(phone)}
    """)
    return rows[0] if rows else None


async def _create_user(phone: str) -> dict:
    now = get_timestamp_now()
    guid = new_guid()
    rows = await query_db(f"""
        INSERT INTO users (guid, phone, language, created_at, updated_at)
        VALUES (
            {fit_to_sql(guid)},
            {fit_to_sql(phone)},
            'ru',
            {fit_to_sql(now)},
            {fit_to_sql(now)}
        )
        RETURNING id, guid, phone, full_name, language, fcm_token, is_blocked
    """)
    return rows[0]


def _user_public(user: dict) -> dict:
    """Безопасный срез юзера для отдачи клиенту (без fcm_token и is_blocked)."""
    return {
        'id': user['id'],
        'guid': user['guid'],
        'phone': user['phone'],
        'full_name': user['full_name'],
        'language': user['language'],
    }


# -------------------------------------------------------------------------
# Эндпоинты
# -------------------------------------------------------------------------

@router.post('/request-otp')
async def request_otp(body: RequestOtpBody):
    phone = normalize_phone(body.phone)
    now = get_timestamp_now()

    # Защита от спама: не чаще 1 запроса в 60 секунд на номер.
    # Считаем "отправленным недавно" любой неиспользованный живой код,
    # созданный за последние 60 секунд.
    rate_limit_boundary = add_minutes(now, -1)   # now - 1 минута
    recent = await query_db(f"""
        SELECT id FROM otp_codes
        WHERE phone = {fit_to_sql(phone)}
          AND used = false
          AND created_at > {fit_to_sql(rate_limit_boundary)}
        LIMIT 1
    """)
    if recent:
        raise WarnException(429, 'Код уже отправлен. Повторите попытку через минуту.')

    # Любой прежний неиспользованный код — помечаем использованным (Вариант А).
    await query_db(f"""
        UPDATE otp_codes
           SET used = true
         WHERE phone = {fit_to_sql(phone)}
           AND used = false
    """)

    # Создаём новый код
    # dev — фиксированный '0000' (удобно тестировать)
    # prod — случайные 4 цифры
    if config['env'] == 'dev':
        code = config['otp']['mock_code']   # '0000'
    else:
        import secrets
        code = f'{secrets.randbelow(10000):04d}'

    expires_at = add_minutes(now, config['otp']['ttl_minutes'])
    await query_db(f"""
        INSERT INTO otp_codes (phone, code, created_at, expires_at, used)
        VALUES (
            {fit_to_sql(phone)},
            {fit_to_sql(code)},
            {fit_to_sql(now)},
            {fit_to_sql(expires_at)},
            false
        )
    """)

    await send_otp(phone, code)
    return {'sent': True}


@router.post('/verify-otp')
async def verify_otp(body: VerifyOtpBody):
    phone = normalize_phone(body.phone)
    now = get_timestamp_now()

    # Ищем живой неиспользованный код для этого номера.
    rows = await query_db(f"""
        SELECT id, code, expires_at
        FROM otp_codes
        WHERE phone = {fit_to_sql(phone)}
          AND used = false
        ORDER BY id DESC
        LIMIT 1
    """)
    if not rows:
        raise WarnException(400, 'Код не запрошен или уже использован')

    otp = rows[0]

    # Истёк?
    if otp['expires_at'] < now:
        # Пометим использованным, чтобы не светился в /request-otp rate-limit
        await query_db(f"""
            UPDATE otp_codes SET used = true WHERE id = {fit_to_sql(otp['id'])}
        """)
        raise WarnException(400, 'Срок действия кода истёк. Запросите новый.')

    # Не совпал?
    if otp['code'] != body.code:
        raise WarnException(400, 'Неверный код')

    # Код валиден -> используем его
    await query_db(f"""
        UPDATE otp_codes SET used = true WHERE id = {fit_to_sql(otp['id'])}
    """)

    # Ищем или создаём юзера
    user = await _user_by_phone(phone)
    is_new_user = False
    if user is None:
        user = await _create_user(phone)
        is_new_user = True
    elif user['is_blocked']:
        raise WarnException(403, 'Аккаунт заблокирован')

    token = issue_token(user['id'])
    return {
        'token': token,
        'is_new_user': is_new_user,
        'user': _user_public(user),
    }


@router.post('/complete-profile')
async def complete_profile(body: CompleteProfileBody, user=Depends(auth_user)):
    now = get_timestamp_now()
    rows = await query_db(f"""
        UPDATE users
           SET full_name = {fit_to_sql(body.full_name)},
               language  = {fit_to_sql(body.language)},
               updated_at = {fit_to_sql(now)}
         WHERE id = {fit_to_sql(user['id'])}
        RETURNING id, guid, phone, full_name, language
    """)
    return {'user': rows[0]}


@router.post('/fcm-token')
async def set_fcm_token(body: FcmTokenBody, user=Depends(auth_user)):
    now = get_timestamp_now()
    await query_db(f"""
        UPDATE users
           SET fcm_token = {fit_to_sql(body.token)},
               updated_at = {fit_to_sql(now)}
         WHERE id = {fit_to_sql(user['id'])}
    """)
    return {'ok': True}
