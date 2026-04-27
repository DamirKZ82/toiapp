"""
Залы (halls) + их фото.

    POST   /halls                        — создать
    GET    /halls/{guid}                 — детали (с фото и опциями)
    PATCH  /halls/{guid}                 — обновить
    DELETE /halls/{guid}                 — удалить (каскад по FK + удаление файлов с диска)

    POST   /halls/{guid}/photos          — загрузить пачку фото (multipart: files[])
    DELETE /halls/photos/{photo_id}      — удалить одно фото
    PATCH  /halls/{guid}/photos/order    — переупорядочить фото
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel, field_validator

from connections.connect_postgres import query_db
from handlers.h01_errors import WarnException
from handlers.h03_auth import auth_user
from libs.common import fit_to_sql, new_guid
from libs.date import get_timestamp_now
from libs.ownership import (
    require_venue_owner,
    require_hall_owner,
)
from libs.photos import save_hall_photo, delete_photo_files


router = APIRouter(prefix='/halls')


# -------------------------------------------------------------------------
# Pydantic
# -------------------------------------------------------------------------

class HallCreateBody(BaseModel):
    venue_guid: str
    name: str
    description: Optional[str] = None
    area_sqm: Optional[int] = None
    capacity_min: Optional[int] = None
    capacity_max: Optional[int] = None
    price_weekday: int
    price_weekend: int
    amenity_ids: List[int] = []

    @field_validator('name')
    @classmethod
    def name_ok(cls, val):
        val = (val or '').strip()
        if not val:
            raise ValueError('Название зала не может быть пустым')
        if len(val) > 200:
            raise ValueError('Название не должно быть длиннее 200 символов')
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

    @field_validator('area_sqm')
    @classmethod
    def area_ok(cls, val):
        if val is None:
            return None
        if val <= 0 or val > 100000:
            raise ValueError('Некорректная квадратура')
        return val

    @field_validator('capacity_min')
    @classmethod
    def cap_min_ok(cls, val):
        if val is None:
            return None
        if val < 1 or val > 100000:
            raise ValueError('Некорректная минимальная вместимость')
        return val

    @field_validator('capacity_max')
    @classmethod
    def cap_max_ok(cls, val):
        if val is None:
            return None
        if val < 1 or val > 100000:
            raise ValueError('Некорректная максимальная вместимость')
        return val

    @field_validator('price_weekday', 'price_weekend')
    @classmethod
    def price_ok(cls, val):
        if val < 0 or val > 1_000_000_000:
            raise ValueError('Некорректная цена')
        return val


class HallPatchBody(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    area_sqm: Optional[int] = None
    capacity_min: Optional[int] = None
    capacity_max: Optional[int] = None
    price_weekday: Optional[int] = None
    price_weekend: Optional[int] = None
    amenity_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None

    @field_validator('name')
    @classmethod
    def name_ok(cls, val):
        if val is None:
            return None
        val = val.strip()
        if not val:
            raise ValueError('Название зала не может быть пустым')
        if len(val) > 200:
            raise ValueError('Название не должно быть длиннее 200 символов')
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

    @field_validator('area_sqm')
    @classmethod
    def area_ok(cls, val):
        if val is None:
            return None
        if val <= 0 or val > 100000:
            raise ValueError('Некорректная квадратура')
        return val

    @field_validator('capacity_min', 'capacity_max')
    @classmethod
    def cap_ok(cls, val):
        if val is None:
            return None
        if val < 1 or val > 100000:
            raise ValueError('Некорректная вместимость')
        return val

    @field_validator('price_weekday', 'price_weekend')
    @classmethod
    def price_ok(cls, val):
        if val is None:
            return None
        if val < 0 or val > 1_000_000_000:
            raise ValueError('Некорректная цена')
        return val


class PhotoOrderBody(BaseModel):
    photo_ids: List[int]

    @field_validator('photo_ids')
    @classmethod
    def not_empty(cls, val):
        if not val:
            raise ValueError('Список photo_ids не может быть пустым')
        return val


# -------------------------------------------------------------------------
# Хелперы
# -------------------------------------------------------------------------

async def _validate_amenities(amenity_ids: List[int]) -> None:
    if not amenity_ids:
        return
    ids_sql = ', '.join(str(int(i)) for i in amenity_ids)
    rows = await query_db(f"SELECT id FROM hall_amenities WHERE id IN ({ids_sql})")
    found = {r['id'] for r in rows}
    missing = set(amenity_ids) - found
    if missing:
        raise WarnException(400, f'Неизвестные опции: {sorted(missing)}')


async def _replace_amenities(hall_id: int, amenity_ids: List[int]) -> None:
    await query_db(f"DELETE FROM hall_amenity_links WHERE hall_id = {fit_to_sql(hall_id)}")
    for aid in amenity_ids:
        await query_db(f"""
            INSERT INTO hall_amenity_links (hall_id, amenity_id)
            VALUES ({fit_to_sql(hall_id)}, {fit_to_sql(aid)})
        """)


async def _hall_photos(hall_id: int) -> List[dict]:
    return await query_db(f"""
        SELECT id, file_path, thumb_path, sort_order
        FROM hall_photos
        WHERE hall_id = {fit_to_sql(hall_id)}
        ORDER BY sort_order, id
    """)


async def _hall_amenities(hall_id: int) -> List[dict]:
    return await query_db(f"""
        SELECT a.id, a.code, a.name_ru, a.name_kz, a.icon
        FROM hall_amenity_links hal
        JOIN hall_amenities a ON a.id = hal.amenity_id
        WHERE hal.hall_id = {fit_to_sql(hall_id)}
        ORDER BY a.id
    """)


def _check_capacity_range(cmin, cmax):
    if cmin is not None and cmax is not None and cmin > cmax:
        raise WarnException(400, 'Минимальная вместимость больше максимальной')


# -------------------------------------------------------------------------
# Роуты — CRUD зала
# -------------------------------------------------------------------------

@router.post('')
async def create_hall(body: HallCreateBody, user=Depends(auth_user)):
    venue = await require_venue_owner(body.venue_guid, user)
    _check_capacity_range(body.capacity_min, body.capacity_max)
    await _validate_amenities(body.amenity_ids)

    now = get_timestamp_now()
    guid = new_guid()
    rows = await query_db(f"""
        INSERT INTO halls (
            guid, venue_id, name, description,
            area_sqm, capacity_min, capacity_max,
            price_weekday, price_weekend,
            is_active, created_at, updated_at
        )
        VALUES (
            {fit_to_sql(guid)},
            {fit_to_sql(venue['id'])},
            {fit_to_sql(body.name)},
            {fit_to_sql(body.description)},
            {fit_to_sql(body.area_sqm)},
            {fit_to_sql(body.capacity_min)},
            {fit_to_sql(body.capacity_max)},
            {fit_to_sql(body.price_weekday)},
            {fit_to_sql(body.price_weekend)},
            true,
            {fit_to_sql(now)},
            {fit_to_sql(now)}
        )
        RETURNING id, guid, venue_id, name, description,
                  area_sqm, capacity_min, capacity_max,
                  price_weekday, price_weekend,
                  is_active, created_at, updated_at
    """)
    hall = rows[0]
    await _replace_amenities(hall['id'], body.amenity_ids)

    hall['amenities'] = await _hall_amenities(hall['id'])
    hall['photos'] = []
    return {'hall': hall}


@router.get('/{guid}')
async def get_hall(guid: str, user=Depends(auth_user)):
    hall, _venue = await require_hall_owner(guid, user)
    hall['photos'] = await _hall_photos(hall['id'])
    hall['amenities'] = await _hall_amenities(hall['id'])
    return {'hall': hall}


@router.patch('/{guid}')
async def patch_hall(guid: str, body: HallPatchBody, user=Depends(auth_user)):
    hall, _venue = await require_hall_owner(guid, user)

    # Для проверки согласованности min/max смотрим на будущее значение:
    # если min не трогаем — берём текущее из БД, и наоборот.
    cmin = body.capacity_min if body.capacity_min is not None else hall['capacity_min']
    cmax = body.capacity_max if body.capacity_max is not None else hall['capacity_max']
    _check_capacity_range(cmin, cmax)

    updates = []
    if body.name is not None:
        updates.append(f"name = {fit_to_sql(body.name)}")
    if body.description is not None:
        updates.append(f"description = {fit_to_sql(body.description)}")
    if body.area_sqm is not None:
        updates.append(f"area_sqm = {fit_to_sql(body.area_sqm)}")
    if body.capacity_min is not None:
        updates.append(f"capacity_min = {fit_to_sql(body.capacity_min)}")
    if body.capacity_max is not None:
        updates.append(f"capacity_max = {fit_to_sql(body.capacity_max)}")
    if body.price_weekday is not None:
        updates.append(f"price_weekday = {fit_to_sql(body.price_weekday)}")
    if body.price_weekend is not None:
        updates.append(f"price_weekend = {fit_to_sql(body.price_weekend)}")
    if body.is_active is not None:
        updates.append(f"is_active = {fit_to_sql(body.is_active)}")

    if body.amenity_ids is not None:
        await _validate_amenities(body.amenity_ids)
        await _replace_amenities(hall['id'], body.amenity_ids)

    if not updates and body.amenity_ids is None:
        raise WarnException(400, 'Нет полей для обновления')

    if updates:
        updates.append(f"updated_at = {fit_to_sql(get_timestamp_now())}")
        set_clause = ', '.join(updates)
        await query_db(f"""
            UPDATE halls SET {set_clause}
            WHERE id = {fit_to_sql(hall['id'])}
        """)

    # Возвращаем свежее состояние
    updated = await query_db(f"""
        SELECT id, guid, venue_id, name, description,
               area_sqm, capacity_min, capacity_max,
               price_weekday, price_weekend,
               is_active, created_at, updated_at
        FROM halls WHERE id = {fit_to_sql(hall['id'])}
    """)
    result = updated[0]
    result['photos'] = await _hall_photos(hall['id'])
    result['amenities'] = await _hall_amenities(hall['id'])
    return {'hall': result}


@router.delete('/{guid}')
async def delete_hall(guid: str, user=Depends(auth_user)):
    """Жёсткий DELETE. Файлы фото удаляются с диска после удаления из БД."""
    hall, _venue = await require_hall_owner(guid, user)

    photos = await query_db(f"""
        SELECT file_path, thumb_path FROM hall_photos
        WHERE hall_id = {fit_to_sql(hall['id'])}
    """)
    await query_db(f"DELETE FROM halls WHERE id = {fit_to_sql(hall['id'])}")

    for p in photos:
        delete_photo_files(p['file_path'], p['thumb_path'])
    return {'deleted': True}


# -------------------------------------------------------------------------
# Роуты — фото
# -------------------------------------------------------------------------

@router.post('/{guid}/photos')
async def upload_photos(
    guid: str,
    files: List[UploadFile] = File(...),
    user=Depends(auth_user),
):
    """Загружает пачку фото. В ответе — список созданных записей в порядке загрузки."""
    hall, _venue = await require_hall_owner(guid, user)

    if not files:
        raise WarnException(400, 'Нет файлов для загрузки')

    # Сколько уже есть + сколько добавляем
    existing = await query_db(f"""
        SELECT COUNT(*)::int AS n,
               COALESCE(MAX(sort_order), -1)::int AS max_order
        FROM hall_photos WHERE hall_id = {fit_to_sql(hall['id'])}
    """)
    existing_count = existing[0]['n']
    next_order = existing[0]['max_order'] + 1

    limit = 20   # из ТЗ: до 20 фото на зал
    if existing_count + len(files) > limit:
        raise WarnException(
            400,
            f'Превышен лимит фото: {limit}. Уже загружено {existing_count}, '
            f'в запросе {len(files)}'
        )

    now = get_timestamp_now()
    created = []
    for upload in files:
        content = await upload.read()
        file_path, thumb_path = await save_hall_photo(
            hall_id=hall['id'],
            filename=upload.filename or 'photo',
            content=content,
        )
        rows = await query_db(f"""
            INSERT INTO hall_photos (hall_id, file_path, thumb_path, sort_order, created_at)
            VALUES (
                {fit_to_sql(hall['id'])},
                {fit_to_sql(file_path)},
                {fit_to_sql(thumb_path)},
                {fit_to_sql(next_order)},
                {fit_to_sql(now)}
            )
            RETURNING id, file_path, thumb_path, sort_order
        """)
        created.append(rows[0])
        next_order += 1

    return {'items': created}


@router.delete('/photos/{photo_id}')
async def delete_photo(photo_id: int, user=Depends(auth_user)):
    rows = await query_db(f"""
        SELECT hp.id, hp.hall_id, hp.file_path, hp.thumb_path,
               v.owner_id
        FROM hall_photos hp
        JOIN halls h  ON h.id = hp.hall_id
        JOIN venues v ON v.id = h.venue_id
        WHERE hp.id = {fit_to_sql(photo_id)}
    """)
    if not rows:
        raise WarnException(404, 'Фото не найдено')
    photo = rows[0]
    if photo['owner_id'] != user['id']:
        raise WarnException(403, 'Недостаточно прав')

    await query_db(f"DELETE FROM hall_photos WHERE id = {fit_to_sql(photo_id)}")
    delete_photo_files(photo['file_path'], photo['thumb_path'])
    return {'deleted': True}


@router.patch('/{guid}/photos/order')
async def reorder_photos(guid: str, body: PhotoOrderBody, user=Depends(auth_user)):
    hall, _venue = await require_hall_owner(guid, user)

    existing = await query_db(f"""
        SELECT id FROM hall_photos WHERE hall_id = {fit_to_sql(hall['id'])}
    """)
    existing_ids = {r['id'] for r in existing}
    requested_ids = set(body.photo_ids)

    if requested_ids != existing_ids:
        raise WarnException(400, 'Список photo_ids должен содержать ВСЕ id текущих фото зала')

    for order, pid in enumerate(body.photo_ids):
        await query_db(f"""
            UPDATE hall_photos SET sort_order = {fit_to_sql(order)}
            WHERE id = {fit_to_sql(pid)}
        """)

    photos = await _hall_photos(hall['id'])
    return {'items': photos}
