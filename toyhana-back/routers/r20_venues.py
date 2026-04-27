"""
Заведения (venues).

    GET    /venues/my        — мои заведения (со списком залов кратко)
    POST   /venues           — создать
    GET    /venues/{guid}    — детали + все залы с фото
    PATCH  /venues/{guid}    — обновить
    DELETE /venues/{guid}    — удалить (жёсткий delete; всё по cascade, включая залы и брони)
"""
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, field_validator

from connections.connect_postgres import query_db
from handlers.h01_errors import WarnException
from handlers.h03_auth import auth_user
from libs.common import fit_to_sql, new_guid
from libs.date import get_timestamp_now
from libs.ownership import require_venue_owner


router = APIRouter(prefix='/venues')


# -------------------------------------------------------------------------
# Pydantic
# -------------------------------------------------------------------------

class VenueCreateBody(BaseModel):
    city_id: int
    name: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    phone: Optional[str] = None

    @field_validator('name')
    @classmethod
    def name_ok(cls, val):
        val = (val or '').strip()
        if not val:
            raise ValueError('Название заведения не может быть пустым')
        if len(val) > 200:
            raise ValueError('Название не должно быть длиннее 200 символов')
        return val

    @field_validator('address')
    @classmethod
    def address_ok(cls, val):
        val = (val or '').strip()
        if not val:
            raise ValueError('Адрес не может быть пустым')
        if len(val) > 500:
            raise ValueError('Адрес не должен быть длиннее 500 символов')
        return val

    @field_validator('description')
    @classmethod
    def description_ok(cls, val):
        if val is None:
            return None
        val = val.strip()
        if len(val) > 5000:
            raise ValueError('Описание не должно быть длиннее 5000 символов')
        return val or None

    @field_validator('phone')
    @classmethod
    def phone_ok(cls, val):
        if val is None:
            return None
        val = val.strip()
        if len(val) > 20:
            raise ValueError('Телефон не должен быть длиннее 20 символов')
        return val or None

    @field_validator('latitude')
    @classmethod
    def lat_ok(cls, val):
        if val is None:
            return None
        if not (-90 <= val <= 90):
            raise ValueError('Широта должна быть в диапазоне [-90, 90]')
        return val

    @field_validator('longitude')
    @classmethod
    def lng_ok(cls, val):
        if val is None:
            return None
        if not (-180 <= val <= 180):
            raise ValueError('Долгота должна быть в диапазоне [-180, 180]')
        return val


class VenuePatchBody(BaseModel):
    city_id: Optional[int] = None
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    phone: Optional[str] = None

    # Те же проверки, но опциональные (None — не трогать)
    @field_validator('name')
    @classmethod
    def name_ok(cls, val):
        if val is None:
            return None
        val = val.strip()
        if not val:
            raise ValueError('Название заведения не может быть пустым')
        if len(val) > 200:
            raise ValueError('Название не должно быть длиннее 200 символов')
        return val

    @field_validator('address')
    @classmethod
    def address_ok(cls, val):
        if val is None:
            return None
        val = val.strip()
        if not val:
            raise ValueError('Адрес не может быть пустым')
        if len(val) > 500:
            raise ValueError('Адрес не должен быть длиннее 500 символов')
        return val

    @field_validator('description')
    @classmethod
    def description_ok(cls, val):
        if val is None:
            return None
        val = val.strip()
        if len(val) > 5000:
            raise ValueError('Описание не должно быть длиннее 5000 символов')
        return val

    @field_validator('phone')
    @classmethod
    def phone_ok(cls, val):
        if val is None:
            return None
        val = val.strip()
        if len(val) > 20:
            raise ValueError('Телефон не должен быть длиннее 20 символов')
        return val

    @field_validator('latitude')
    @classmethod
    def lat_ok(cls, val):
        if val is not None and not (-90 <= val <= 90):
            raise ValueError('Широта должна быть в диапазоне [-90, 90]')
        return val

    @field_validator('longitude')
    @classmethod
    def lng_ok(cls, val):
        if val is not None and not (-180 <= val <= 180):
            raise ValueError('Долгота должна быть в диапазоне [-180, 180]')
        return val


# -------------------------------------------------------------------------
# Хелперы загрузки
# -------------------------------------------------------------------------

async def _city_exists(city_id: int) -> bool:
    rows = await query_db(f"SELECT 1 AS x FROM cities WHERE id = {fit_to_sql(city_id)}")
    return bool(rows)


async def _halls_brief_for_venue(venue_id: int) -> list[dict]:
    """Краткая информация о залах (для списка): + главное превью."""
    halls = await query_db(f"""
        SELECT h.id, h.guid, h.name, h.capacity_min, h.capacity_max,
               h.price_weekday, h.price_weekend, h.is_active
        FROM halls h
        WHERE h.venue_id = {fit_to_sql(venue_id)}
        ORDER BY h.id
    """)
    if not halls:
        return []
    # Одно главное превью на каждый зал (первое по sort_order, затем по id)
    hall_ids = [h['id'] for h in halls]
    ids_sql = ', '.join(str(i) for i in hall_ids)
    photos = await query_db(f"""
        SELECT DISTINCT ON (hall_id) hall_id, thumb_path
        FROM hall_photos
        WHERE hall_id IN ({ids_sql})
        ORDER BY hall_id, sort_order, id
    """)
    thumb_by_hall = {p['hall_id']: p['thumb_path'] for p in photos}
    for h in halls:
        h['main_thumb'] = thumb_by_hall.get(h['id'])
    return halls


async def _halls_full_for_venue(venue_id: int) -> list[dict]:
    """Детальная информация (для экрана заведения)."""
    halls = await query_db(f"""
        SELECT id, guid, name, description, area_sqm,
               capacity_min, capacity_max,
               price_weekday, price_weekend, is_active
        FROM halls
        WHERE venue_id = {fit_to_sql(venue_id)}
        ORDER BY id
    """)
    if not halls:
        return []
    hall_ids = [h['id'] for h in halls]
    ids_sql = ', '.join(str(i) for i in hall_ids)

    photos = await query_db(f"""
        SELECT id, hall_id, file_path, thumb_path, sort_order
        FROM hall_photos
        WHERE hall_id IN ({ids_sql})
        ORDER BY hall_id, sort_order, id
    """)
    amenities = await query_db(f"""
        SELECT hal.hall_id, a.id, a.code, a.name_ru, a.name_kz, a.icon
        FROM hall_amenity_links hal
        JOIN hall_amenities a ON a.id = hal.amenity_id
        WHERE hal.hall_id IN ({ids_sql})
        ORDER BY a.id
    """)

    photos_by_hall: dict[int, list[dict]] = {}
    for p in photos:
        photos_by_hall.setdefault(p['hall_id'], []).append(p)
    amenities_by_hall: dict[int, list[dict]] = {}
    for a in amenities:
        amenities_by_hall.setdefault(a.pop('hall_id'), []).append(a)

    for h in halls:
        h['photos'] = photos_by_hall.get(h['id'], [])
        h['amenities'] = amenities_by_hall.get(h['id'], [])
    return halls


# -------------------------------------------------------------------------
# Роуты
# -------------------------------------------------------------------------

@router.get('/my')
async def my_venues(user=Depends(auth_user)):
    venues = await query_db(f"""
        SELECT id, guid, city_id, name, address,
               latitude, longitude, description, phone, is_active,
               created_at, updated_at
        FROM venues
        WHERE owner_id = {fit_to_sql(user['id'])}
        ORDER BY id DESC
    """)
    for v in venues:
        v['halls'] = await _halls_brief_for_venue(v['id'])
    return {'items': venues}


@router.post('')
async def create_venue(body: VenueCreateBody, user=Depends(auth_user)):
    if not await _city_exists(body.city_id):
        raise WarnException(400, 'Город не найден в справочнике')

    now = get_timestamp_now()
    guid = new_guid()
    rows = await query_db(f"""
        INSERT INTO venues (
            guid, owner_id, city_id, name, address,
            latitude, longitude, description, phone,
            is_active, created_at, updated_at
        )
        VALUES (
            {fit_to_sql(guid)},
            {fit_to_sql(user['id'])},
            {fit_to_sql(body.city_id)},
            {fit_to_sql(body.name)},
            {fit_to_sql(body.address)},
            {fit_to_sql(body.latitude)},
            {fit_to_sql(body.longitude)},
            {fit_to_sql(body.description)},
            {fit_to_sql(body.phone)},
            true,
            {fit_to_sql(now)},
            {fit_to_sql(now)}
        )
        RETURNING id, guid, city_id, name, address,
                  latitude, longitude, description, phone,
                  is_active, created_at, updated_at
    """)
    return {'venue': rows[0]}


@router.get('/{guid}')
async def get_venue(guid: str, user=Depends(auth_user)):
    venue = await require_venue_owner(guid, user)
    venue['halls'] = await _halls_full_for_venue(venue['id'])
    return {'venue': venue}


@router.patch('/{guid}')
async def patch_venue(guid: str, body: VenuePatchBody, user=Depends(auth_user)):
    venue = await require_venue_owner(guid, user)

    updates = []
    if body.city_id is not None:
        if not await _city_exists(body.city_id):
            raise WarnException(400, 'Город не найден в справочнике')
        updates.append(f"city_id = {fit_to_sql(body.city_id)}")
    if body.name is not None:
        updates.append(f"name = {fit_to_sql(body.name)}")
    if body.address is not None:
        updates.append(f"address = {fit_to_sql(body.address)}")
    if body.latitude is not None:
        updates.append(f"latitude = {fit_to_sql(body.latitude)}")
    if body.longitude is not None:
        updates.append(f"longitude = {fit_to_sql(body.longitude)}")
    if body.description is not None:
        updates.append(f"description = {fit_to_sql(body.description)}")
    if body.phone is not None:
        updates.append(f"phone = {fit_to_sql(body.phone)}")

    if not updates:
        raise WarnException(400, 'Нет полей для обновления')

    updates.append(f"updated_at = {fit_to_sql(get_timestamp_now())}")
    set_clause = ', '.join(updates)

    rows = await query_db(f"""
        UPDATE venues SET {set_clause}
        WHERE id = {fit_to_sql(venue['id'])}
        RETURNING id, guid, city_id, name, address,
                  latitude, longitude, description, phone,
                  is_active, created_at, updated_at
    """)
    return {'venue': rows[0]}


@router.delete('/{guid}')
async def delete_venue(guid: str, user=Depends(auth_user)):
    """
    Жёсткий DELETE. Всё, что ссылается (halls, photos, bookings, reviews),
    каскадно удаляется через FK ON DELETE CASCADE.
    Файлы фото при этом остаются на диске — их чистит удаление на уровне зала.
    Поэтому корректно: сначала удалим файлы всех фото всех залов этого заведения,
    потом сам venue.
    """
    venue = await require_venue_owner(guid, user)

    # Соберём пути всех файлов, чтобы удалить их с диска
    from libs.photos import delete_photo_files
    photos = await query_db(f"""
        SELECT hp.file_path, hp.thumb_path
        FROM hall_photos hp
        JOIN halls h ON h.id = hp.hall_id
        WHERE h.venue_id = {fit_to_sql(venue['id'])}
    """)

    await query_db(f"DELETE FROM venues WHERE id = {fit_to_sql(venue['id'])}")

    for p in photos:
        delete_photo_files(p['file_path'], p['thumb_path'])

    return {'deleted': True}
