"""
Справочники для фронта.
Бэк отдаёт оба языковых поля (name_ru, name_kz) — фронт выбирает сам,
это позволяет мгновенно переключать язык без повторного запроса.
"""
from fastapi import APIRouter

from connections.connect_postgres import query_db


router = APIRouter(prefix='/dicts')


@router.get('/cities')
async def get_cities():
    rows = await query_db("""
        SELECT id, name_ru, name_kz
        FROM cities
        WHERE is_active = true
        ORDER BY name_ru
    """)
    return {'items': rows}


@router.get('/amenities')
async def get_amenities():
    rows = await query_db("""
        SELECT id, code, name_ru, name_kz, icon
        FROM hall_amenities
        ORDER BY id
    """)
    return {'items': rows}


@router.get('/event-types')
async def get_event_types():
    rows = await query_db("""
        SELECT id, code, name_ru, name_kz
        FROM event_types
        ORDER BY id
    """)
    return {'items': rows}


@router.get('/holidays')
async def get_holidays():
    rows = await query_db("""
        SELECT date, name_ru, name_kz
        FROM holidays
        ORDER BY date
    """)
    return {'items': rows}
