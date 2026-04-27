"""
Работа с датами и таймштампами.
Во всей кодовой базе используем ТОЛЬКО функции отсюда — никаких локальных хелперов.
Формат: CHAR(19) для таймштампа, CHAR(10) для даты.
"""
from datetime import datetime, timedelta, timezone


# Казахстан — UTC+5 (Астана, Алматы). Один часовой пояс на всю страну с 2024.
KZ_TZ = timezone(timedelta(hours=5))


def get_timestamp_now() -> str:
    """'2026-03-28T18:55:55' — локальное казахстанское время."""
    return datetime.now(KZ_TZ).strftime('%Y-%m-%dT%H:%M:%S')


def get_date_today() -> str:
    """'2026-03-28' — сегодняшняя дата по казахстанскому времени."""
    return datetime.now(KZ_TZ).strftime('%Y-%m-%d')


def add_minutes(ts: str, minutes: int) -> str:
    """Прибавить минуты к таймштампу формата CHAR(19)."""
    dt = datetime.strptime(ts, '%Y-%m-%dT%H:%M:%S')
    dt += timedelta(minutes=minutes)
    return dt.strftime('%Y-%m-%dT%H:%M:%S')


def date_is_weekend(date_str: str) -> bool:
    """True если дата — суббота или воскресенье."""
    dt = datetime.strptime(date_str, '%Y-%m-%d')
    return dt.weekday() >= 5   # 5 = Sat, 6 = Sun


def date_lt(a: str, b: str) -> bool:
    """Сравнение дат-строк; работает корректно благодаря формату YYYY-MM-DD."""
    return a < b
