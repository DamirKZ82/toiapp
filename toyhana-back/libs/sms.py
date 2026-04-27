"""
Отправка SMS.
На этапе MVP — мок: ничего никуда не отправляем, просто пишем в консоль.
Когда будет реальный провайдер (Mobizon/SMSC KZ/...), подменим реализацию здесь
одной функцией, роутеры не тронутся.
"""
from libs.date import get_timestamp_now
from temp_settings import OTP_MOCK_ENABLED


async def send_otp(phone: str, code: str) -> None:
    """Отправить OTP-код на номер. На MVP — логируем в консоль."""
    if OTP_MOCK_ENABLED:
        print(f"[{get_timestamp_now()}] 📱 MOCK SMS -> {phone}: код {code}")
        return
    # На проде здесь будет HTTP-вызов реального шлюза через httpx
    raise RuntimeError('Real SMS gateway is not configured')
