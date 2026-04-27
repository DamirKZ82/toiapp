"""
JWT токены: выпуск и декодирование.
Используется HS256 + секрет из config['jwt']['secret'].
Payload: { 'user_id': int, 'exp': unix_ts }
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt

from config import config


def issue_token(user_id: int) -> str:
    """Выпустить JWT для пользователя. Срок жизни — config['jwt']['ttl_days']."""
    now = datetime.now(timezone.utc)
    payload = {
        'user_id': user_id,
        'exp': now + timedelta(days=config['jwt']['ttl_days']),
        'iat': now,
    }
    return jwt.encode(payload, config['jwt']['secret'], algorithm=config['jwt']['algorithm'])


def decode_token(token: str) -> Optional[dict]:
    """
    Декодировать токен. Вернуть payload или None, если токен невалидный/истёк.
    Никогда не бросает исключение — вызывающий решает, что делать с None.
    """
    try:
        return jwt.decode(token, config['jwt']['secret'], algorithms=[config['jwt']['algorithm']])
    except jwt.PyJWTError:
        return None
