"""
Несекретные параметры проекта.
Секреты — в .env (DB_PASSWORD, JWT_SECRET, MOBIZON_API_KEY, ...).
"""
import os
from dotenv import load_dotenv


# Загружаем .env из корня проекта (toyhana-back/.env).
# Если файл отсутствует — не падаем: переменные могут быть заданы средой
# (например, на проде через systemd/docker).
load_dotenv()


def _require(value, name):
    """Если обязательный параметр пуст — сервер падает с понятным сообщением."""
    if not value:
        raise RuntimeError(f'Config error: missing required parameter [{name}]')
    return value


env = os.environ.get('TOYHANA_ENV', 'dev')   # 'dev' | 'stage' | 'prod'
is_dev = env == 'dev'
is_stage = env == 'stage'
is_prod = env == 'prod'


config = {
    'env': env,
    'port': 1500 if is_prod else 1600 if is_stage else 4000,

    'db': {
        'host': os.environ.get('DB_HOST', 'localhost'),
        'port': int(os.environ.get('DB_PORT', '5432')),
        'name': os.environ.get('DB_NAME', 'toyhana'),
        'user': os.environ.get('DB_USER', 'toyhana_user'),
        'password': _require(os.environ.get('DB_PASSWORD'), 'DB_PASSWORD'),
        'min_size': 2,
        'max_size': 10,
    },

    'jwt': {
        'secret': _require(os.environ.get('JWT_SECRET'), 'JWT_SECRET'),
        'algorithm': 'HS256',
        'ttl_days': 30,
    },

    'uploads': {
        'root': os.environ.get('UPLOADS_ROOT', './uploads'),
        'photo_max_long_side': 1920,
        'photo_thumb_side': 400,
        'photo_jpeg_quality': 85,
        'hall_photos_limit': 20,
    },

    'telegram': {
        # Если токен не задан — уведомления просто не отправляются (без падения).
        'bot_token': os.environ.get('TELEGRAM_BOT_TOKEN', ''),
        'chat_id': os.environ.get('TELEGRAM_CHAT_ID', ''),
    },

    'twogis': {
        # Ключ нужен мобильному приложению, бэку он не обязателен; лежит в .env для удобства.
        'api_key': os.environ.get('TWOGIS_API_KEY', ''),
    },

    'cors': {
        # На dev открыто всё; на prod сузим по списку доменов при деплое.
        'allow_origins': ['*'] if is_dev else [],
    },

    'otp': {
        # На MVP — мок. Код всегда равен mock_code, TTL указан для будущей замены на реальный шлюз.
        'mock_code': '0000',
        'ttl_minutes': 5,
    },
}
