"""
Работа с номером телефона.
Формат хранения и передачи по API: +7XXXXXXXXXX (12 символов, только цифры после +7).
"""
import re

from handlers.h01_errors import WarnException


def normalize_phone(raw: str) -> str:
    """
    Приводит номер к формату +7XXXXXXXXXX.
    Принимает варианты:
        87011234567
        +77011234567
        +7 (701) 123-45-67
        8 701 123 45 67
    Если номер некорректный — бросает WarnException(400).
    """
    if raw is None:
        raise WarnException(400, 'Номер телефона обязателен')

    # Оставляем только цифры
    digits = re.sub(r'\D', '', str(raw))

    # 8XXXXXXXXXX -> 7XXXXXXXXXX (11 цифр, начинается с 8)
    if len(digits) == 11 and digits.startswith('8'):
        digits = '7' + digits[1:]

    # Должно получиться 11 цифр, начинающихся с 77 (казахстанский мобильный префикс).
    # Российские +7 (начинающиеся на 79, 74, ...) не принимаем — у нас сервис для КЗ.
    if len(digits) != 11 or not digits.startswith('77'):
        raise WarnException(400, 'Некорректный номер телефона. Формат: +77XXXXXXXXX')

    return '+' + digits
