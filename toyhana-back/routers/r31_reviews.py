"""
Отзывы.

    POST /reviews                    — создать отзыв (клиент, только после прошедшей подтверждённой брони)
    GET  /halls/{guid}/reviews       — публичный список отзывов зала (имя клиента маскируется)
    POST /reviews/{guid}/reply       — ответ владельца (можно перезаписывать)

По этапу 5 клиент НЕ может редактировать/удалять свой отзыв.
"""
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, field_validator

from connections.connect_postgres import query_db
from handlers.h01_errors import WarnException
from handlers.h03_auth import auth_user
from libs.common import fit_to_sql, new_guid
from libs.date import get_date_today, get_timestamp_now
from libs.ownership import get_hall_by_guid


router = APIRouter()


# -------------------------------------------------------------------------
# Pydantic
# -------------------------------------------------------------------------

class ReviewCreateBody(BaseModel):
    booking_guid: str
    rating: int
    text: Optional[str] = None

    @field_validator('rating')
    @classmethod
    def rating_ok(cls, val):
        if val < 1 or val > 5:
            raise ValueError('Оценка должна быть от 1 до 5')
        return val

    @field_validator('text')
    @classmethod
    def text_ok(cls, val):
        if val is None:
            return None
        val = val.strip()
        if len(val) > 2000:
            raise ValueError('Текст отзыва не должен быть длиннее 2000 символов')
        return val or None


class ReviewReplyBody(BaseModel):
    reply_text: str

    @field_validator('reply_text')
    @classmethod
    def reply_ok(cls, val):
        val = (val or '').strip()
        if not val:
            raise ValueError('Текст ответа не может быть пустым')
        if len(val) > 2000:
            raise ValueError('Текст ответа не должен быть длиннее 2000 символов')
        return val


# -------------------------------------------------------------------------
# Хелперы
# -------------------------------------------------------------------------

def _mask_name(full_name: Optional[str]) -> str:
    """'Дамир Иванов' -> 'Дамир И.', 'Дамир' -> 'Дамир', None/'' -> 'Пользователь'."""
    if not full_name:
        return 'Пользователь'
    parts = full_name.strip().split()
    if not parts:
        return 'Пользователь'
    if len(parts) == 1:
        return parts[0]
    return f"{parts[0]} {parts[1][0].upper()}."


# -------------------------------------------------------------------------
# Роуты
# -------------------------------------------------------------------------

@router.post('/reviews')
async def create_review(body: ReviewCreateBody, user=Depends(auth_user)):
    # Найдём бронь и проверим условия
    rows = await query_db(f"""
        SELECT b.id, b.hall_id, b.client_id, b.status, b.event_date
        FROM bookings b
        WHERE b.guid = {fit_to_sql(body.booking_guid)}
    """)
    if not rows:
        raise WarnException(404, 'Заявка не найдена')
    booking = rows[0]

    if booking['client_id'] != user['id']:
        raise WarnException(403, 'Недостаточно прав')
    if booking['status'] != 'confirmed':
        raise WarnException(400, 'Отзыв можно оставить только по подтверждённой заявке')
    if booking['event_date'] >= get_date_today():
        raise WarnException(400, 'Отзыв можно оставить только после мероприятия')

    # Не более одного отзыва на бронь
    existing = await query_db(f"""
        SELECT 1 AS x FROM reviews WHERE booking_id = {fit_to_sql(booking['id'])}
    """)
    if existing:
        raise WarnException(400, 'Отзыв уже оставлен')

    now = get_timestamp_now()
    guid = new_guid()
    rows = await query_db(f"""
        INSERT INTO reviews (guid, booking_id, hall_id, client_id, rating, text, created_at)
        VALUES (
            {fit_to_sql(guid)},
            {fit_to_sql(booking['id'])},
            {fit_to_sql(booking['hall_id'])},
            {fit_to_sql(user['id'])},
            {fit_to_sql(body.rating)},
            {fit_to_sql(body.text)},
            {fit_to_sql(now)}
        )
        RETURNING id, guid, hall_id, rating, text, owner_reply, owner_reply_at, created_at
    """)
    return {'review': rows[0]}


@router.get('/halls/{guid}/reviews')
async def hall_reviews(guid: str):
    """Публичный список отзывов зала. Имя клиента маскируется."""
    hall = await get_hall_by_guid(guid)
    if hall is None:
        raise WarnException(404, 'Зал не найден')

    rows = await query_db(f"""
        SELECT r.id, r.guid, r.rating, r.text,
               r.owner_reply, r.owner_reply_at, r.created_at,
               u.full_name AS client_name
        FROM reviews r
        LEFT JOIN users u ON u.id = r.client_id
        WHERE r.hall_id = {fit_to_sql(hall['id'])}
        ORDER BY r.id DESC
    """)
    items = []
    for r in rows:
        items.append({
            'id': r['id'],
            'guid': r['guid'],
            'rating': r['rating'],
            'text': r['text'],
            'owner_reply': r['owner_reply'],
            'owner_reply_at': r['owner_reply_at'],
            'created_at': r['created_at'],
            'client_name': _mask_name(r['client_name']),
        })

    # Заодно — агрегированный рейтинг
    agg = await query_db(f"""
        SELECT
            COALESCE(AVG(rating), 0)::float AS avg_rating,
            COUNT(*)::int AS reviews_count
        FROM reviews
        WHERE hall_id = {fit_to_sql(hall['id'])}
    """)
    return {
        'items': items,
        'avg_rating': round(agg[0]['avg_rating'], 2),
        'reviews_count': agg[0]['reviews_count'],
    }


@router.post('/reviews/{guid}/reply')
async def reply_to_review(guid: str, body: ReviewReplyBody, user=Depends(auth_user)):
    rows = await query_db(f"""
        SELECT r.id, r.hall_id, v.owner_id
        FROM reviews r
        JOIN halls h  ON h.id = r.hall_id
        JOIN venues v ON v.id = h.venue_id
        WHERE r.guid = {fit_to_sql(guid)}
    """)
    if not rows:
        raise WarnException(404, 'Отзыв не найден')
    review = rows[0]

    if review['owner_id'] != user['id']:
        raise WarnException(403, 'Недостаточно прав')

    now = get_timestamp_now()
    updated = await query_db(f"""
        UPDATE reviews
           SET owner_reply = {fit_to_sql(body.reply_text)},
               owner_reply_at = {fit_to_sql(now)}
         WHERE id = {fit_to_sql(review['id'])}
        RETURNING id, guid, rating, text, owner_reply, owner_reply_at, created_at
    """)
    return {'review': updated[0]}
