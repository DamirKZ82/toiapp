"""
Общие утилиты.
"""
import uuid


def fit_to_sql(value) -> str:
    """
    Подготовка значения для инлайн-вставки в SQL через f-string.

    Правила:
        None       -> 'null'
        bool       -> 'true' / 'false'
        int/float  -> строковое представление числа
        str        -> строка в одинарных кавычках с экранированием апострофов
        list/tuple -> 'ARRAY[...]' с рекурсивным fit_to_sql для каждого элемента

    Пример:
        sql = f"INSERT INTO t (a, b, c) VALUES ({fit_to_sql('O\\'Neil')}, {fit_to_sql(None)}, {fit_to_sql(True)})"
        # -> "INSERT INTO t (a, b, c) VALUES ('O''Neil', null, true)"
    """
    if value is None:
        return 'null'
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (list, tuple)):
        inner = ', '.join(fit_to_sql(item) for item in value)
        return f"ARRAY[{inner}]"
    # всё остальное приводим к строке и экранируем одинарные кавычки удвоением
    text = str(value).replace("'", "''")
    return f"'{text}'"


def new_guid() -> str:
    """Генерация нового GUID в формате строки CHAR(36)."""
    return str(uuid.uuid4())
