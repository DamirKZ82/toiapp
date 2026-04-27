"""
Служебные роуты:
- POST /front-error — приём необработанных ошибок из мобильного приложения
- GET  /health — пинг для мониторинга
"""
from typing import Optional
from fastapi import APIRouter, Request
from pydantic import BaseModel, field_validator

from connections.connect_postgres import query_db
from libs.common import fit_to_sql
from libs.date import get_timestamp_now


router = APIRouter()


class FrontErrorBody(BaseModel):
    message: str
    stack: Optional[str] = None
    screen: Optional[str] = None

    @field_validator('message')
    @classmethod
    def message_not_empty(cls, val):
        if not val or not val.strip():
            raise ValueError('Текст ошибки не может быть пустым')
        return val.strip()


@router.post('/front-error')
async def front_error(body: FrontErrorBody, request: Request):
    user_id = getattr(request.state, 'user_id', None)
    await query_db(f"""
        INSERT INTO errors_front (message, stack, screen, user_id, created_at)
        VALUES (
            {fit_to_sql(body.message)},
            {fit_to_sql(body.stack)},
            {fit_to_sql(body.screen)},
            {fit_to_sql(user_id)},
            {fit_to_sql(get_timestamp_now())}
        )
    """)
    return {'ok': True}


@router.get('/health')
async def health():
    return {'status': 'ok', 'ts': get_timestamp_now()}
