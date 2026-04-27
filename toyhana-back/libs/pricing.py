"""
Определение тарифа на дату.

Правила:
    - если дата — выходной (сб/вс) -> price_weekend
    - если дата в справочнике holidays -> price_weekend
    - иначе -> price_weekday

Набор праздников кэшируется в памяти на время работы процесса.
Если в holidays добавятся новые записи после старта — нужен рестарт сервера.
Для MVP это ок; в будущем можно сделать периодический refresh.
"""
from typing import Optional

from connections.connect_postgres import query_db
from libs.date import date_is_weekend


_holidays_cache: Optional[set[str]] = None


async def _load_holidays() -> set[str]:
    """Кэшированный набор праздничных дат (строки CHAR(10))."""
    global _holidays_cache
    if _holidays_cache is not None:
        return _holidays_cache
    rows = await query_db("SELECT date FROM holidays")
    _holidays_cache = {r['date'] for r in rows}
    return _holidays_cache


async def is_weekend_or_holiday(date_str: str) -> bool:
    """True если дата — суббота/воскресенье или праздник РК."""
    if date_is_weekend(date_str):
        return True
    holidays = await _load_holidays()
    return date_str in holidays


async def price_on_date(price_weekday: int, price_weekend: int, date_str: str) -> int:
    """Вернёт актуальный тариф для конкретной даты."""
    if await is_weekend_or_holiday(date_str):
        return price_weekend
    return price_weekday


def reset_holidays_cache() -> None:
    """Сбросить кэш (на случай ручного редактирования справочника через админку)."""
    global _holidays_cache
    _holidays_cache = None
