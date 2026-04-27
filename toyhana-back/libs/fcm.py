"""
Push-уведомления.

На этапе 10 переключено на **Expo Push Service** — бесплатный сервис Expo,
который внутри сам доставляет в FCM (Android) и APNs (iOS).

Преимущество: работает и в Expo Go, и в настоящей сборке.
Недостаток: зависимость от стороннего сервиса (ок для MVP).

Как это работает:
    - Фронт через expo-notifications получает ExpoPushToken вида "ExponentPushToken[xxx...]"
      и отправляет его нам: POST /auth/fcm-token
    - Мы сохраняем токен в users.fcm_token (поле универсальное, подойдёт под любой провайдер).
    - При наступлении событий (новая заявка / подтверждение / отказ / отмена) бэк
      делает POST на https://exp.host/--/api/v2/push/send с массивом сообщений.

В проде можно переключиться на прямой FCM — поле `fcm_token` тогда будет содержать
настоящий FCM registration token, а код отправки поменяется. Здесь оставляем простой путь.

Поведение модуля:
    - Если у юзера нет токена — молча логируем и выходим (не ошибка).
    - Если токен похож на Expo token (начинается с "ExponentPushToken[") —
      отправляем через Expo Push Service.
    - Если токен другой — отправляем в mock-режиме (только консоль), не ломая поток.
    - Все сетевые ошибки проглатываются — пуш не должен ронять основной сценарий.
"""
import asyncio
from typing import Optional

import httpx

from connections.connect_postgres import query_db
from libs.common import fit_to_sql
from libs.date import get_timestamp_now


EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
EXPO_PUSH_TIMEOUT = 10.0   # секунды


def _is_expo_token(token: str) -> bool:
    return bool(token) and (
        token.startswith('ExponentPushToken[')
        or token.startswith('ExpoPushToken[')
    )


async def _token_by_user_id(user_id: int) -> Optional[str]:
    rows = await query_db(f"""
        SELECT fcm_token FROM users WHERE id = {fit_to_sql(user_id)}
    """)
    if not rows:
        return None
    return rows[0]['fcm_token']


async def _send_via_expo(token: str, title: str, body: str, data: Optional[dict]) -> bool:
    """Отправка одного сообщения через Expo Push Service."""
    payload = {
        'to': token,
        'title': title,
        'body': body,
        'sound': 'default',
    }
    if data:
        payload['data'] = {k: str(v) for k, v in data.items()}

    try:
        async with httpx.AsyncClient(timeout=EXPO_PUSH_TIMEOUT) as client:
            resp = await client.post(
                EXPO_PUSH_URL,
                json=payload,
                headers={
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
            )
        if resp.status_code != 200:
            print(f"[{get_timestamp_now()}] ⚠️ Expo Push HTTP {resp.status_code}: {resp.text[:200]}")
            return False
        data = resp.json()
        # Expo возвращает { data: { status: 'ok'|'error', ... } } для одного токена
        res = data.get('data') if isinstance(data, dict) else None
        if isinstance(res, dict) and res.get('status') == 'error':
            print(f"[{get_timestamp_now()}] ⚠️ Expo Push error: {res.get('message')}")
            return False
        return True
    except Exception as err:
        print(f"[{get_timestamp_now()}] ⚠️ Expo Push exception: {err}")
        return False


async def send_push(user_id: int, title: str, body: str, data: Optional[dict] = None) -> bool:
    """
    Отправить push пользователю.

    - Возвращает True при успехе или в mock-режиме (операция не считается ошибкой бэка).
    - Все сетевые сбои проглатываются.
    """
    token = await _token_by_user_id(user_id)
    if not token:
        print(f"[{get_timestamp_now()}] 🔕 Push skipped: user={user_id} has no push token. title={title!r}")
        return True

    if _is_expo_token(token):
        ok = await _send_via_expo(token, title, body, data)
        if ok:
            print(f"[{get_timestamp_now()}] ✉️ Push sent (Expo) -> user={user_id}: {title}")
        return ok

    # Неизвестный формат токена — mock
    print(f"[{get_timestamp_now()}] 🔕 MOCK push (unknown token fmt) -> user={user_id}: {title} | {body}")
    return True
