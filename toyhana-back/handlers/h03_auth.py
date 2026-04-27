"""
Зависимости аутентификации.

auth_user — обязательная авторизация. Достаёт JWT из заголовка
Authorization: Bearer <token>, декодирует, находит юзера в БД,
кладёт user_id в request.state (чтобы попадал в errors_back/warns),
возвращает полный dict юзера.

Если токена нет / невалидный / юзер удалён        -> WarnException(401)
Если юзер заблокирован (is_blocked = true)        -> WarnException(403)
"""
from fastapi import Request

from connections.connect_postgres import query_db
from handlers.h01_errors import WarnException
from libs.auth import decode_token
from libs.common import fit_to_sql


async def auth_user(request: Request) -> dict:
    # 1) Authorization: Bearer <token>
    header = request.headers.get('Authorization') or request.headers.get('authorization')
    if not header or not header.lower().startswith('bearer '):
        raise WarnException(401, 'Требуется авторизация')

    token = header[7:].strip()
    if not token:
        raise WarnException(401, 'Требуется авторизация')

    # 2) Декодируем
    payload = decode_token(token)
    if payload is None:
        raise WarnException(401, 'Недействительный токен')

    user_id = payload.get('user_id')
    if not isinstance(user_id, int):
        raise WarnException(401, 'Недействительный токен')

    # 3) Ищем юзера в БД
    rows = await query_db(f"""
        SELECT id, guid, phone, full_name, language, fcm_token, is_blocked
        FROM users
        WHERE id = {fit_to_sql(user_id)}
    """)
    if not rows:
        raise WarnException(401, 'Пользователь не найден')

    user = rows[0]
    if user['is_blocked']:
        raise WarnException(403, 'Аккаунт заблокирован')

    # Кладём id в state — чтобы глобальный error-handler мог писать его в errors_back
    request.state.user_id = user['id']
    return user
