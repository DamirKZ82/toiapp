"""
Поиск залов (публичный, без JWT).

    GET /search/halls?city_id=1&date=2026-08-15&guests=150&price_max=500000
                     &amenity_ids=1,2,3&sort=rating_desc&page=1&page_size=20

Параметры:
    city_id       (обязательный, int)
    date          (опционально, YYYY-MM-DD, должен быть >= сегодня)
    guests        (опционально, int)
    price_max     (опционально, int; сравнивается с ценой на указанную дату, либо с price_weekday если даты нет)
    amenity_ids   (опционально, CSV: "1,2,3" — зал должен иметь ВСЕ указанные опции)
    sort          (опционально: 'rating_desc' | 'price_asc' | 'price_desc'; default: rating_desc)
    page          (default 1)
    page_size     (default 20, max 50)
"""
import re
from typing import Optional

from fastapi import APIRouter, Query

from connections.connect_postgres import query_db
from handlers.h01_errors import WarnException
from libs.common import fit_to_sql
from libs.date import get_date_today
from libs.pricing import is_weekend_or_holiday


router = APIRouter(prefix='/search')


ALLOWED_SORT = {'rating_desc', 'price_asc', 'price_desc'}
DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def _parse_amenity_ids(raw: Optional[str]) -> list[int]:
    if not raw:
        return []
    try:
        ids = [int(x.strip()) for x in raw.split(',') if x.strip()]
    except ValueError:
        raise WarnException(400, 'amenity_ids должны быть целыми числами через запятую')
    return ids


@router.get('/halls')
async def search_halls(
    city_id: Optional[int] = Query(None, description='ID города (опционально — если не задан, вернутся залы всех городов)'),
    date: Optional[str] = Query(None, description='YYYY-MM-DD'),
    guests: Optional[int] = Query(None, ge=1),
    price_max: Optional[int] = Query(None, ge=0),
    amenity_ids: Optional[str] = Query(None, description='CSV: "1,2,3"'),
    sort: str = Query('rating_desc'),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
):
    # --- Валидация ---
    if sort not in ALLOWED_SORT:
        raise WarnException(400, f'sort должен быть одним из: {sorted(ALLOWED_SORT)}')

    # Проверка существования города (если указан)
    if city_id is not None:
        rows = await query_db(f"""
            SELECT 1 AS x FROM cities WHERE id = {fit_to_sql(city_id)}
        """)
        if not rows:
            raise WarnException(400, 'Город не найден в справочнике')

    # Проверка даты
    is_weekend = False
    if date is not None:
        if not DATE_RE.match(date):
            raise WarnException(400, 'Некорректный формат даты. Ожидается YYYY-MM-DD')
        if date < get_date_today():
            raise WarnException(400, 'Дата должна быть не раньше сегодняшней')
        is_weekend = await is_weekend_or_holiday(date)

    amenity_list = _parse_amenity_ids(amenity_ids)

    # --- Формируем WHERE ---
    where = [
        "h.is_active = true",
        "v.is_active = true",
    ]
    if city_id is not None:
        where.append(f"v.city_id = {fit_to_sql(city_id)}")

    if guests is not None:
        # Зал подходит, если гости помещаются в диапазон [capacity_min..capacity_max].
        # Если min/max не заданы, считаем что подходит всем.
        where.append(f"""(
            (h.capacity_min IS NULL OR h.capacity_min <= {fit_to_sql(guests)})
            AND
            (h.capacity_max IS NULL OR h.capacity_max >= {fit_to_sql(guests)})
        )""")

    if price_max is not None:
        price_col = 'h.price_weekend' if is_weekend else 'h.price_weekday'
        where.append(f"{price_col} <= {fit_to_sql(price_max)}")

    if amenity_list:
        # Зал должен иметь ВСЕ указанные опции.
        ids_sql = ', '.join(str(int(i)) for i in amenity_list)
        where.append(f"""h.id IN (
            SELECT hall_id FROM hall_amenity_links
            WHERE amenity_id IN ({ids_sql})
            GROUP BY hall_id
            HAVING COUNT(DISTINCT amenity_id) = {len(amenity_list)}
        )""")

    where_sql = ' AND '.join(where)

    # --- ORDER BY ---
    # Цена, по которой сортируем, зависит от is_weekend
    price_col_for_sort = 'h.price_weekend' if is_weekend else 'h.price_weekday'
    if sort == 'price_asc':
        order_by = f'{price_col_for_sort} ASC, h.id DESC'
    elif sort == 'price_desc':
        order_by = f'{price_col_for_sort} DESC, h.id DESC'
    else:   # rating_desc
        order_by = 'avg_rating DESC NULLS LAST, reviews_count DESC, h.id DESC'

    # --- Основной SQL: один запрос, без N+1 ---
    # LATERAL join для thumb_path (одно главное превью) и агрегация reviews.
    offset = (page - 1) * page_size

    # Флаг "занято на дату" — показываем только если дата задана
    busy_select = 'false AS is_busy_on_date'
    if date is not None:
        busy_select = f"""EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.hall_id = h.id
              AND b.event_date = {fit_to_sql(date)}
              AND b.status = 'confirmed'
        ) AS is_busy_on_date"""

    sql = f"""
        SELECT
            h.id AS hall_id,
            h.guid AS hall_guid,
            h.name AS hall_name,
            h.description AS hall_description,
            h.area_sqm,
            h.capacity_min,
            h.capacity_max,
            h.price_weekday,
            h.price_weekend,
            v.id AS venue_id,
            v.guid AS venue_guid,
            v.name AS venue_name,
            v.address,
            v.latitude,
            v.longitude,
            c.id AS city_id,
            c.name_ru AS city_name_ru,
            c.name_kz AS city_name_kz,
            ph.thumb_path AS main_thumb,
            ph.file_path AS main_photo,
            COALESCE(r.avg_rating, 0)::float AS avg_rating,
            COALESCE(r.reviews_count, 0)::int AS reviews_count,
            {busy_select}
        FROM halls h
        JOIN venues v ON v.id = h.venue_id
        JOIN cities c ON c.id = v.city_id
        LEFT JOIN LATERAL (
            SELECT thumb_path, file_path
            FROM hall_photos
            WHERE hall_id = h.id
            ORDER BY sort_order, id
            LIMIT 1
        ) ph ON true
        LEFT JOIN (
            SELECT hall_id,
                   AVG(rating)::float AS avg_rating,
                   COUNT(*)::int AS reviews_count
            FROM reviews
            GROUP BY hall_id
        ) r ON r.hall_id = h.id
        WHERE {where_sql}
        ORDER BY {order_by}
        LIMIT {fit_to_sql(page_size)} OFFSET {fit_to_sql(offset)}
    """
    rows = await query_db(sql)

    # Отдельный запрос для total (простой COUNT по тому же WHERE, без JOIN photos/reviews)
    count_sql = f"""
        SELECT COUNT(*)::int AS n
        FROM halls h
        JOIN venues v ON v.id = h.venue_id
        WHERE {where_sql}
    """
    cnt = await query_db(count_sql)
    total = cnt[0]['n']

    # --- Формируем ответ ---
    items = []
    for r in rows:
        # Цена на дату (если дата указана) или ориентировочная (price_weekday)
        if date is not None:
            price_on_date = r['price_weekend'] if is_weekend else r['price_weekday']
            price_is_estimate = False
        else:
            price_on_date = r['price_weekday']
            price_is_estimate = True

        items.append({
            'hall': {
                'id': r['hall_id'],
                'guid': r['hall_guid'],
                'name': r['hall_name'],
                'description': r['hall_description'],
                'area_sqm': r['area_sqm'],
                'capacity_min': r['capacity_min'],
                'capacity_max': r['capacity_max'],
                'price_weekday': r['price_weekday'],
                'price_weekend': r['price_weekend'],
            },
            'venue': {
                'id': r['venue_id'],
                'guid': r['venue_guid'],
                'name': r['venue_name'],
                'address': r['address'],
                'latitude': float(r['latitude']) if r['latitude'] is not None else None,
                'longitude': float(r['longitude']) if r['longitude'] is not None else None,
            },
            'city': {
                'id': r['city_id'],
                'name_ru': r['city_name_ru'],
                'name_kz': r['city_name_kz'],
            },
            'main_photo': r['main_photo'],
            'main_thumb': r['main_thumb'],
            'rating': {
                'avg': round(r['avg_rating'], 2),
                'count': r['reviews_count'],
            },
            'price_on_date': price_on_date,
            'price_is_estimate': price_is_estimate,
            'is_busy_on_date': r['is_busy_on_date'],
        })

    return {
        'items': items,
        'total': total,
        'page': page,
        'page_size': page_size,
        'date': date,
        'is_weekend_or_holiday': is_weekend if date else None,
    }


# -------------------------------------------------------------------------
# Публичный просмотр деталей зала (без JWT).
# Используется на карточке зала (экран C02).
# В отличие от GET /halls/{guid} (владельцу), этот эндпоинт — для всех.
# -------------------------------------------------------------------------

@router.get('/halls/{guid}')
async def public_hall_details(guid: str):
    rows = await query_db(f"""
        SELECT h.id, h.guid, h.venue_id, h.name, h.description,
               h.area_sqm, h.capacity_min, h.capacity_max,
               h.price_weekday, h.price_weekend, h.is_active,
               h.created_at, h.updated_at,
               v.guid AS venue_guid, v.name AS venue_name,
               v.address, v.latitude, v.longitude, v.is_active AS venue_is_active,
               c.id AS city_id, c.name_ru AS city_name_ru, c.name_kz AS city_name_kz
        FROM halls h
        JOIN venues v ON v.id = h.venue_id
        JOIN cities c ON c.id = v.city_id
        WHERE h.guid = {fit_to_sql(guid)}
    """)
    if not rows:
        raise WarnException(404, 'Зал не найден')
    r = rows[0]
    if not r['is_active'] or not r['venue_is_active']:
        raise WarnException(404, 'Зал не найден')

    photos = await query_db(f"""
        SELECT id, file_path, thumb_path, sort_order
        FROM hall_photos
        WHERE hall_id = {fit_to_sql(r['id'])}
        ORDER BY sort_order, id
    """)
    amenities = await query_db(f"""
        SELECT a.id, a.code, a.name_ru, a.name_kz, a.icon
        FROM hall_amenity_links hal
        JOIN hall_amenities a ON a.id = hal.amenity_id
        WHERE hal.hall_id = {fit_to_sql(r['id'])}
        ORDER BY a.id
    """)

    return {
        'hall': {
            'id': r['id'],
            'guid': r['guid'],
            'venue_id': r['venue_id'],
            'name': r['name'],
            'description': r['description'],
            'area_sqm': r['area_sqm'],
            'capacity_min': r['capacity_min'],
            'capacity_max': r['capacity_max'],
            'price_weekday': r['price_weekday'],
            'price_weekend': r['price_weekend'],
            'is_active': r['is_active'],
            'created_at': r['created_at'],
            'updated_at': r['updated_at'],
            'photos': photos,
            'amenities': amenities,
            'venue': {
                'guid': r['venue_guid'],
                'name': r['venue_name'],
                'address': r['address'],
                'latitude': float(r['latitude']) if r['latitude'] is not None else None,
                'longitude': float(r['longitude']) if r['longitude'] is not None else None,
            },
            'city': {
                'id': r['city_id'],
                'name_ru': r['city_name_ru'],
                'name_kz': r['city_name_kz'],
            },
        },
    }
