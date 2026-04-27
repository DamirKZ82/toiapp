"""
Профиль текущего пользователя:

    GET   /profile          -> {user}
    PATCH /profile          { full_name?, language? } -> {user}
"""
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, field_validator

from connections.connect_postgres import query_db
from handlers.h01_errors import WarnException
from handlers.h03_auth import auth_user
from libs.common import fit_to_sql
from libs.date import get_timestamp_now


router = APIRouter(prefix='/profile')


class ProfilePatchBody(BaseModel):
    full_name: Optional[str] = None
    language: Optional[str] = None

    @field_validator('full_name')
    @classmethod
    def full_name_valid(cls, val):
        if val is None:
            return None
        val = val.strip()
        if not val:
            raise ValueError('ФИО не может быть пустым')
        if len(val) > 200:
            raise ValueError('ФИО не должно быть длиннее 200 символов')
        return val

    @field_validator('language')
    @classmethod
    def language_valid(cls, val):
        if val is None:
            return None
        val = val.strip().lower()
        if val not in ('ru', 'kz'):
            raise ValueError("Язык должен быть 'ru' или 'kz'")
        return val


def _user_public(user: dict) -> dict:
    return {
        'id': user['id'],
        'guid': user['guid'],
        'phone': user['phone'],
        'full_name': user['full_name'],
        'language': user['language'],
    }


@router.get('')
async def get_profile(user=Depends(auth_user)):
    return {'user': _user_public(user)}


@router.patch('')
async def patch_profile(body: ProfilePatchBody, user=Depends(auth_user)):
    # Собираем набор полей для обновления
    updates = []
    if body.full_name is not None:
        updates.append(f"full_name = {fit_to_sql(body.full_name)}")
    if body.language is not None:
        updates.append(f"language = {fit_to_sql(body.language)}")

    if not updates:
        raise WarnException(400, 'Нет полей для обновления')

    updates.append(f"updated_at = {fit_to_sql(get_timestamp_now())}")
    set_clause = ', '.join(updates)

    rows = await query_db(f"""
        UPDATE users
           SET {set_clause}
         WHERE id = {fit_to_sql(user['id'])}
        RETURNING id, guid, phone, full_name, language
    """)
    return {'user': rows[0]}
