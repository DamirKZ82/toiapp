# =============================================================================
# Toyhana backend — production Docker image
#
# Multi-stage сборка:
#   - builder: ставит зависимости в /opt/venv, собирает wheels
#   - runtime: тонкий финальный образ с только runtime-артефактами
#
# Запускается uvicorn'ом на порту 1500 (TOYHANA_ENV=prod).
# =============================================================================

# ----------------------- Stage 1: builder -----------------------
FROM python:3.12-slim AS builder

# Системные зависимости для сборки asyncpg / Pillow / cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libjpeg-dev \
    zlib1g-dev \
 && rm -rf /var/lib/apt/lists/*

# Создаём изолированный venv внутри образа.
# Все пакеты ставим туда — потом просто скопируем в финальный образ.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# ----------------------- Stage 2: runtime -----------------------
FROM python:3.12-slim

# Только runtime-зависимости (без -dev)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libjpeg62-turbo \
    zlib1g \
    curl \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd -r toyhana && useradd -r -g toyhana -m -d /home/toyhana toyhana

# Готовый venv из builder-стадии
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TOYHANA_ENV=prod

WORKDIR /app

# Код приложения. Не копируем .env, .venv, __pycache__ — это в .dockerignore
COPY --chown=toyhana:toyhana . /app

# Папка для загруженных фото — будет смонтирована как Docker volume
RUN mkdir -p /data/uploads && chown -R toyhana:toyhana /data
ENV UPLOADS_ROOT=/data/uploads

USER toyhana

# Healthcheck для docker-compose / k8s / nginx upstream
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:1500/dicts/cities >/dev/null || exit 1

EXPOSE 1500

# Одновременно запустит миграции и поднимет сервер.
# В config.py is_prod => port=1500. Слушаем все интерфейсы.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "1500", "--workers", "2", "--proxy-headers", "--forwarded-allow-ips=*"]
