"""
Бронирование — этап 5.

    POST   /bookings                 — создать заявку (клиент)
    GET    /bookings/my              — мои заявки (клиентские)
    GET    /bookings/incoming        — входящие заявки (по всем моим залам, для владельца)
    POST   /bookings/{guid}/confirm  — подтвердить (владелец) — авто-отклоняет конкурентов
    POST   /bookings/{guid}/reject   — отклонить (владелец), нужен reason
    POST   /bookings/{guid}/cancel   — отменить свою заявку (клиент)
    GET    /halls/{guid}/calendar    — календарь занятости зала (из этапа 4)
"""
import calendar as cal
import re
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, field_validator

from connections.connect_postgres import query_db, transaction
from handlers.h01_errors import WarnException
from handlers.h03_auth import auth_user
from libs.common import fit_to_sql, new_guid
from libs.date import get_date_today, get_timestamp_now
from libs.fcm import send_push
from libs.ownership import get_hall_by_guid
from libs.pricing import is_weekend_or_holiday


router = APIRouter()


DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
MONTH_RE = re.compile(r'^\d{4}-\d{2}$')
ALLOWED_STATUS_FILTERS = {'pending', 'confirmed', 'rejected', 'cancelled'}


# -------------------------------------------------------------------------
# Pydantic модели
# -------------------------------------------------------------------------

class BookingCreateBody(BaseModel):
    hall_guid: str
    event_date: str
    guests_count: int
    event_type_id: Optional[int] = None
    comment: Optional[str] = None

    @field_validator('event_date')
    @classmethod
    def event_date_ok(cls, val):
        val = (val or '').strip()
        if not DATE_RE.match(val):
            raise ValueError('Некорректный формат даты. Ожидается YYYY-MM-DD')
        return val

    @field_validator('guests_count')
    @classmethod
    def guests_ok(cls, val):
        if val < 1 or val > 100000:
            raise ValueError('Количество гостей должно быть от 1 до 100 000')
        return val

    @field_validator('comment')
    @classmethod
    def comment_ok(cls, val):
        if val is None:
            return None
        val = val.strip()
        if len(val) > 2000:
            raise ValueError('Комментарий не должен быть длиннее 2000 символов')
        return val or None


class BookingRejectBody(BaseModel):
    reason: str

    @field_validator('reason')
    @classmethod
    def reason_ok(cls, val):
        val = (val or '').strip()
        if not val:
            raise ValueError('Причина отклонения обязательна')
        if len(val) > 1000:
            raise ValueError('Причина не должна быть длиннее 1000 символов')
        return val


# -------------------------------------------------------------------------
# Хелперы
# -------------------------------------------------------------------------

async def _get_booking_by_guid(guid: str) -> Optional[dict]:
    rows = await query_db(f"""
        SELECT b.id, b.guid, b.hall_id, b.client_id, b.event_date,
               b.guests_count, b.event_type_id, b.comment, b.status,
               b.rejected_reason, b.price_at_booking,
               b.created_at, b.updated_at,
               h.name AS hall_name, h.guid AS hall_guid,
               v.id AS venue_id, v.owner_id, v.name AS venue_name
        FROM bookings b
        JOIN halls h   ON h.id = b.hall_id
        JOIN venues v  ON v.id = h.venue_id
        WHERE b.guid = {fit_to_sql(guid)}
    """)
    return rows[0] if rows else None


async def _booking_public(row: dict) -> dict:
    """Нормализованный срез для отдачи клиенту. Включает инфо о зале (null если зал удалён)."""
    # row из _get_booking_by_guid содержит поля из JOIN
    return {
        'id': row['id'],
        'guid': row['guid'],
        'event_date': row['event_date'],
        'guests_count': row['guests_count'],
        'event_type_id': row['event_type_id'],
        'comment': row['comment'],
        'status': row['status'],
        'rejected_reason': row['rejected_reason'],
        'price_at_booking': row['price_at_booking'],
        'created_at': row['created_at'],
        'updated_at': row['updated_at'],
        'hall': {
            'id': row['hall_id'],
            'guid': row.get('hall_guid'),
            'name': row.get('hall_name'),
            'venue_name': row.get('venue_name'),
        } if row.get('hall_guid') else None,
        'hall_deleted': not bool(row.get('hall_guid')),
    }


def _notification_date(date_str: str) -> str:
    """Красивый вид даты для push-сообщения: '15 августа 2026'."""
    # Без сторонних локализаций — минималистичный вариант.
    months_ru = ['', 'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
    y, m, d = date_str.split('-')
    return f"{int(d)} {months_ru[int(m)]} {y}"


# -------------------------------------------------------------------------
# Создание заявки
# -------------------------------------------------------------------------

@router.post('/bookings')
async def create_booking(body: BookingCreateBody, user=Depends(auth_user)):
    # Дата не в прошлом
    if body.event_date < get_date_today():
        raise WarnException(400, 'Дата не может быть в прошлом')

    hall = await get_hall_by_guid(body.hall_guid)
    if hall is None:
        raise WarnException(404, 'Зал не найден')
    if not hall['is_active']:
        raise WarnException(400, 'Зал недоступен для бронирования')

    # Не бронируем свой зал
    venue_row = await query_db(f"""
        SELECT owner_id FROM venues WHERE id = {fit_to_sql(hall['venue_id'])}
    """)
    if venue_row and venue_row[0]['owner_id'] == user['id']:
        raise WarnException(400, 'Нельзя забронировать собственный зал')

    # Вместимость
    cmin = hall['capacity_min']
    cmax = hall['capacity_max']
    if cmin is not None and body.guests_count < cmin:
        raise WarnException(400, f'Зал рассчитан от {cmin} гостей')
    if cmax is not None and body.guests_count > cmax:
        raise WarnException(400, f'Зал рассчитан максимум на {cmax} гостей')

    # Валидация event_type_id (если задан)
    if body.event_type_id is not None:
        et = await query_db(f"""
            SELECT 1 AS x FROM event_types WHERE id = {fit_to_sql(body.event_type_id)}
        """)
        if not et:
            raise WarnException(400, 'Неизвестный тип мероприятия')

    # У этого клиента уже есть активная заявка на эту дату в этот зал?
    mine = await query_db(f"""
        SELECT id, status FROM bookings
        WHERE hall_id = {fit_to_sql(hall['id'])}
          AND client_id = {fit_to_sql(user['id'])}
          AND event_date = {fit_to_sql(body.event_date)}
          AND status IN ('pending', 'confirmed')
    """)
    if mine:
        raise WarnException(400, 'У вас уже есть активная заявка на эту дату')

    # На эту дату есть чужая confirmed бронь?
    busy = await query_db(f"""
        SELECT 1 AS x FROM bookings
        WHERE hall_id = {fit_to_sql(hall['id'])}
          AND event_date = {fit_to_sql(body.event_date)}
          AND status = 'confirmed'
    """)
    if busy:
        raise WarnException(400, 'Дата занята. Выберите другой день.')

    # Зафиксируем цену на дату
    weekend = await is_weekend_or_holiday(body.event_date)
    price_at_booking = hall['price_weekend'] if weekend else hall['price_weekday']

    now = get_timestamp_now()
    guid = new_guid()
    await query_db(f"""
        INSERT INTO bookings (
            guid, hall_id, client_id, event_date, guests_count,
            event_type_id, comment, status, price_at_booking,
            created_at, updated_at
        )
        VALUES (
            {fit_to_sql(guid)},
            {fit_to_sql(hall['id'])},
            {fit_to_sql(user['id'])},
            {fit_to_sql(body.event_date)},
            {fit_to_sql(body.guests_count)},
            {fit_to_sql(body.event_type_id)},
            {fit_to_sql(body.comment)},
            'pending',
            {fit_to_sql(price_at_booking)},
            {fit_to_sql(now)},
            {fit_to_sql(now)}
        )
    """)

    booking = await _get_booking_by_guid(guid)

    # Чат (этап 11): привязан к залу, а не к заявке.
    # Если у клиента уже есть чат с этим залом — прикрепляем booking_id к нему.
    # Если нет — создаём новый чат и сразу прикрепляем booking_id.
    existing = await query_db(f"""
        SELECT id FROM chats
        WHERE hall_id = {fit_to_sql(hall['id'])}
          AND client_id = {fit_to_sql(user['id'])}
    """)
    if existing:
        # Обновим booking_id только если он ещё не был установлен
        # (либо перезапишем — пусть показывает последнюю заявку по залу)
        await query_db(f"""
            UPDATE chats
            SET booking_id = {fit_to_sql(booking['id'])}
            WHERE id = {fit_to_sql(existing[0]['id'])}
        """)
    else:
        chat_guid = new_guid()
        await query_db(f"""
            INSERT INTO chats (guid, hall_id, client_id, owner_id, booking_id, created_at)
            VALUES (
                {fit_to_sql(chat_guid)},
                {fit_to_sql(hall['id'])},
                {fit_to_sql(user['id'])},
                {fit_to_sql(venue_row[0]['owner_id'])},
                {fit_to_sql(booking['id'])},
                {fit_to_sql(now)}
            )
        """)

    # Пуш владельцу: "Новая заявка..."
    await send_push(
        user_id=venue_row[0]['owner_id'],
        title='Новая заявка',
        body=f"{hall['name']}: {_notification_date(body.event_date)}, {body.guests_count} гостей",
        data={'type': 'new_booking', 'booking_guid': guid},
    )

    return {'booking': await _booking_public(booking)}


# -------------------------------------------------------------------------
# Списки
# -------------------------------------------------------------------------

def _status_where(status_filter: Optional[str], prefix: str = 'b') -> str:
    """Вернёт пустую строку или AND-кусок для статуса."""
    if not status_filter:
        return ''
    if status_filter not in ALLOWED_STATUS_FILTERS:
        raise WarnException(400, f'status должен быть одним из: {sorted(ALLOWED_STATUS_FILTERS)}')
    return f" AND {prefix}.status = {fit_to_sql(status_filter)}"


@router.get('/bookings/my')
async def my_bookings(
    status: Optional[str] = Query(None),
    user=Depends(auth_user),
):
    """Заявки, которые подал текущий юзер."""
    status_clause = _status_where(status)
    rows = await query_db(f"""
        SELECT b.id, b.guid, b.hall_id, b.client_id, b.event_date,
               b.guests_count, b.event_type_id, b.comment, b.status,
               b.rejected_reason, b.price_at_booking,
               b.created_at, b.updated_at,
               h.name AS hall_name, h.guid AS hall_guid,
               v.id AS venue_id, v.owner_id, v.name AS venue_name
        FROM bookings b
        LEFT JOIN halls  h ON h.id = b.hall_id
        LEFT JOIN venues v ON v.id = h.venue_id
        WHERE b.client_id = {fit_to_sql(user['id'])}
          {status_clause}
        ORDER BY b.event_date DESC, b.id DESC
    """)
    return {'items': [await _booking_public(r) for r in rows]}


@router.get('/bookings/incoming')
async def incoming_bookings(
    status: Optional[str] = Query(None),
    user=Depends(auth_user),
):
    """Заявки, поступившие на все залы текущего юзера (для владельца)."""
    status_clause = _status_where(status)
    rows = await query_db(f"""
        SELECT b.id, b.guid, b.hall_id, b.client_id, b.event_date,
               b.guests_count, b.event_type_id, b.comment, b.status,
               b.rejected_reason, b.price_at_booking,
               b.created_at, b.updated_at,
               h.name AS hall_name, h.guid AS hall_guid,
               v.id AS venue_id, v.owner_id, v.name AS venue_name,
               u.full_name AS client_name, u.phone AS client_phone
        FROM bookings b
        JOIN halls h   ON h.id = b.hall_id
        JOIN venues v  ON v.id = h.venue_id
        LEFT JOIN users u ON u.id = b.client_id
        WHERE v.owner_id = {fit_to_sql(user['id'])}
          {status_clause}
        ORDER BY b.event_date DESC, b.id DESC
    """)
    items = []
    for r in rows:
        pub = await _booking_public(r)
        # Для входящих показываем данные клиента — у владельца легитимная причина их видеть
        pub['client'] = {
            'name': r['client_name'],
            'phone': r['client_phone'],
        }
        items.append(pub)
    return {'items': items}


# -------------------------------------------------------------------------
# Действия над заявкой
# -------------------------------------------------------------------------

@router.post('/bookings/{guid}/confirm')
async def confirm_booking(guid: str, user=Depends(auth_user)):
    booking = await _get_booking_by_guid(guid)
    if booking is None:
        raise WarnException(404, 'Заявка не найдена')
    if booking['owner_id'] != user['id']:
        raise WarnException(403, 'Недостаточно прав')
    if booking['status'] != 'pending':
        raise WarnException(400, f"Нельзя подтвердить заявку в статусе '{booking['status']}'")

    now = get_timestamp_now()

    # Транзакция: подтвердить эту + отклонить все остальные pending на эту же дату/зал
    async with transaction() as tx:
        await tx.query(f"""
            UPDATE bookings
               SET status = 'confirmed',
                   updated_at = {fit_to_sql(now)}
             WHERE id = {fit_to_sql(booking['id'])}
        """)
        # Сначала найдём отклоняемых (чтобы потом отправить им пуши)
        to_reject = await tx.query(f"""
            SELECT id, guid, client_id, event_date
            FROM bookings
            WHERE hall_id = {fit_to_sql(booking['hall_id'])}
              AND event_date = {fit_to_sql(booking['event_date'])}
              AND status = 'pending'
              AND id != {fit_to_sql(booking['id'])}
        """)
        if to_reject:
            reject_ids = ', '.join(str(r['id']) for r in to_reject)
            await tx.query(f"""
                UPDATE bookings
                   SET status = 'rejected',
                       rejected_reason = 'Дата занята',
                       updated_at = {fit_to_sql(now)}
                 WHERE id IN ({reject_ids})
            """)

    # Пуши ПОСЛЕ коммита (чтобы не оставить рассогласования при откате)
    await send_push(
        user_id=booking['client_id'],
        title='Заявка подтверждена',
        body=f"{booking['hall_name']}: {_notification_date(booking['event_date'])}",
        data={'type': 'booking_confirmed', 'booking_guid': guid},
    )
    for r in to_reject:
        await send_push(
            user_id=r['client_id'],
            title='Заявка отклонена',
            body=f"{booking['hall_name']}: {_notification_date(r['event_date'])}. Причина: Дата занята",
            data={'type': 'booking_rejected', 'booking_guid': r['guid']},
        )

    fresh = await _get_booking_by_guid(guid)
    return {
        'booking': await _booking_public(fresh),
        'auto_rejected_count': len(to_reject),
    }


@router.post('/bookings/{guid}/reject')
async def reject_booking(guid: str, body: BookingRejectBody, user=Depends(auth_user)):
    booking = await _get_booking_by_guid(guid)
    if booking is None:
        raise WarnException(404, 'Заявка не найдена')
    if booking['owner_id'] != user['id']:
        raise WarnException(403, 'Недостаточно прав')
    if booking['status'] not in ('pending', 'confirmed'):
        raise WarnException(400, f"Нельзя отклонить заявку в статусе '{booking['status']}'")

    now = get_timestamp_now()
    await query_db(f"""
        UPDATE bookings
           SET status = 'rejected',
               rejected_reason = {fit_to_sql(body.reason)},
               updated_at = {fit_to_sql(now)}
         WHERE id = {fit_to_sql(booking['id'])}
    """)

    await send_push(
        user_id=booking['client_id'],
        title='Заявка отклонена',
        body=f"{booking['hall_name']}: {_notification_date(booking['event_date'])}. Причина: {body.reason}",
        data={'type': 'booking_rejected', 'booking_guid': guid},
    )

    fresh = await _get_booking_by_guid(guid)
    return {'booking': await _booking_public(fresh)}


@router.post('/bookings/{guid}/cancel')
async def cancel_booking(guid: str, user=Depends(auth_user)):
    booking = await _get_booking_by_guid(guid)
    if booking is None:
        raise WarnException(404, 'Заявка не найдена')
    if booking['client_id'] != user['id']:
        raise WarnException(403, 'Недостаточно прав')
    if booking['status'] not in ('pending', 'confirmed'):
        raise WarnException(400, f"Нельзя отменить заявку в статусе '{booking['status']}'")

    was_confirmed = booking['status'] == 'confirmed'
    now = get_timestamp_now()
    await query_db(f"""
        UPDATE bookings
           SET status = 'cancelled',
               updated_at = {fit_to_sql(now)}
         WHERE id = {fit_to_sql(booking['id'])}
    """)

    # Пуш владельцу только если отменили подтверждённую (это важно — освобождается дата)
    if was_confirmed:
        await send_push(
            user_id=booking['owner_id'],
            title='Клиент отменил бронь',
            body=f"{booking['hall_name']}: {_notification_date(booking['event_date'])}",
            data={'type': 'booking_cancelled', 'booking_guid': guid},
        )

    fresh = await _get_booking_by_guid(guid)
    return {'booking': await _booking_public(fresh)}


# -------------------------------------------------------------------------
# Детали одной заявки.
# Видеть её может только клиент (создатель) или владелец зала.
# -------------------------------------------------------------------------

@router.get('/bookings/{guid}')
async def get_booking(guid: str, user=Depends(auth_user)):
    booking = await _get_booking_by_guid(guid)
    if booking is None:
        raise WarnException(404, 'Заявка не найдена')
    if booking['client_id'] != user['id'] and booking['owner_id'] != user['id']:
        raise WarnException(403, 'Недостаточно прав')

    # Если просмотр от владельца — добавим данные клиента (имя + телефон).
    # Если от клиента — данных клиента не показываем (они и так его собственные).
    public = await _booking_public(booking)
    if booking['owner_id'] == user['id']:
        client_rows = await query_db(f"""
            SELECT full_name, phone FROM users
            WHERE id = {fit_to_sql(booking['client_id'])}
        """)
        if client_rows:
            public['client'] = {
                'name': client_rows[0]['full_name'],
                'phone': client_rows[0]['phone'],
            }
    return {'booking': public}


# -------------------------------------------------------------------------
# Календарь (перенесён из этапа 4 без изменений логики)
# -------------------------------------------------------------------------

@router.get('/halls/{guid}/calendar')
async def hall_calendar(
    guid: str,
    month: str = Query(..., description='YYYY-MM'),
):
    """Календарь занятости зала. Публичный — гости тоже смотрят перед бронью."""
    if not MONTH_RE.match(month):
        raise WarnException(400, 'Некорректный формат месяца. Ожидается YYYY-MM')

    hall = await get_hall_by_guid(guid)
    if hall is None:
        raise WarnException(404, 'Зал не найден')

    try:
        year = int(month[:4])
        mon = int(month[5:7])
        if not (1 <= mon <= 12):
            raise ValueError
        days_in_month = cal.monthrange(year, mon)[1]
    except ValueError:
        raise WarnException(400, 'Некорректный месяц')

    dates = [f'{year:04d}-{mon:02d}-{day:02d}' for day in range(1, days_in_month + 1)]
    first_day, last_day = dates[0], dates[-1]

    rows = await query_db(f"""
        SELECT event_date, status
        FROM bookings
        WHERE hall_id = {fit_to_sql(hall['id'])}
          AND event_date >= {fit_to_sql(first_day)}
          AND event_date <= {fit_to_sql(last_day)}
          AND status IN ('pending', 'confirmed')
    """)

    status_by_date: dict[str, str] = {}
    for r in rows:
        d = r['event_date']
        s = r['status']
        if s == 'confirmed':
            status_by_date[d] = 'confirmed'
        elif status_by_date.get(d) != 'confirmed':
            status_by_date[d] = 'pending'

    today = get_date_today()
    items = []
    for date_str in dates:
        if date_str < today:
            items.append({
                'date': date_str,
                'status': 'past',
                'price': None,
                'is_weekend': False,
            })
            continue

        is_we = await is_weekend_or_holiday(date_str)
        price = hall['price_weekend'] if is_we else hall['price_weekday']
        items.append({
            'date': date_str,
            'status': status_by_date.get(date_str, 'free'),
            'price': price,
            'is_weekend': is_we,
        })

    return {
        'hall_guid': hall['guid'],
        'month': month,
        'items': items,
    }
