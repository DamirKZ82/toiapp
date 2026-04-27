# Toyhana — Production Deployment Guide

Руководство для DevOps. Целевой сервер: Ubuntu 22.04 / 24.04, минимум 2 GB RAM, 20 GB SSD.

---

## 📦 Что в стеке

```
┌─────────────────────────────────────────┐
│           Internet                      │
└────────────────┬────────────────────────┘
                 │ :80 / :443
        ┌────────▼─────────┐
        │      nginx       │  reverse proxy + SSL + /uploads/
        └────────┬─────────┘
                 │ :1500 (internal docker network)
        ┌────────▼─────────┐
        │  FastAPI backend │  uvicorn 2 workers
        └────────┬─────────┘
                 │ :5432
        ┌────────▼─────────┐
        │   PostgreSQL 16  │  named volume `pgdata`
        └──────────────────┘
```

Файлы:
- `docker-compose.yml` — оркестрация
- `toyhana-back/Dockerfile` — multi-stage образ бэка (Python 3.12-slim)
- `nginx/nginx.conf` — reverse proxy
- `.env.example` — шаблон env-переменных
- `.github/workflows/deploy.yml` — CI/CD (build + push в ghcr.io)

---

## 🚀 Quick start

### 1. Подготовка сервера

```bash
# Обновления + базовые инструменты
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg ufw

# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Файрвол
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Клонирование

```bash
cd /opt
sudo git clone https://github.com/DamirKZ82/toyhub.git toyhana
sudo chown -R $USER:$USER toyhana
cd toyhana
```

### 3. Конфигурация

```bash
cp .env.example .env

# Сгенерировать пароли
echo "DB_PASSWORD=$(openssl rand -hex 24)" >> /tmp/secrets
echo "JWT_SECRET=$(openssl rand -hex 32)" >> /tmp/secrets
cat /tmp/secrets   # скопировать в .env, потом удалить
rm /tmp/secrets

nano .env   # вставить пароли, сохранить
```

### 4. Первый запуск (HTTP-only)

```bash
docker compose up -d --build
docker compose logs -f backend   # убедиться что миграции применились
```

Проверка:
```bash
curl http://localhost/dicts/cities | head
```

Должен вернуться JSON со списком городов.

### 5. SSL через Let's Encrypt

**Перед этим шагом:** DNS-запись `api.toyhana.kz` (или ваш домен) должна указывать на IP сервера. Проверить: `dig api.toyhana.kz`.

```bash
# Открываем веб-рут для ACME-challenge
mkdir -p ./certbot/www ./certbot/conf

# Получаем сертификат
docker compose --profile certbot run --rm certbot \
  certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@toyhana.kz \
  --agree-tos \
  --no-eff-email \
  -d api.toyhana.kz
```

После успеха в `./certbot/conf/live/api.toyhana.kz/` появятся `fullchain.pem` и `privkey.pem`.

### 6. Включить HTTPS

Открыть `nginx/nginx.conf`:

1. Раскомментировать секцию `server { listen 443 ssl ...}`
2. Заменить `api.toyhana.kz` на свой домен (две строки)
3. В блоке `:80` закомментировать `location /` (proxy_pass) и раскомментировать `return 301 https://...`

Применить:
```bash
docker compose restart nginx
```

Проверка:
```bash
curl https://api.toyhana.kz/dicts/cities | head
```

### 7. Автоматическое обновление сертификата

Crontab юзера `root` (или того, под кем запущен docker):

```bash
sudo crontab -e
```

Добавить:
```
# Обновление SSL раз в день в 03:30. Перезапуск nginx если сертификат обновился.
30 3 * * * cd /opt/toyhana && docker compose --profile certbot run --rm certbot renew --quiet && docker compose exec nginx nginx -s reload
```

---

## 🔄 Обновление приложения

Когда в `main` пуш кода — GitHub Actions собирает свежий образ в `ghcr.io/damirkz82/toyhana-backend:latest`.

На сервере:

```bash
cd /opt/toyhana
git pull
docker compose pull backend
docker compose up -d backend
docker image prune -f   # очистка старых слоёв
```

Можно автоматизировать в `.github/workflows/deploy.yml` — раскомментировать секцию `deploy:`. Понадобятся секреты:
- `DEPLOY_HOST` — IP или домен сервера
- `DEPLOY_USER` — обычно `deploy` или `root`
- `DEPLOY_SSH_KEY` — приватный ключ (открытый на сервере в `~/.ssh/authorized_keys`)

---

## 💾 Бэкапы

### Простой вариант — ежедневный дамп

`/opt/toyhana/scripts/backup.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
DATE=$(date +%Y-%m-%d_%H%M)
mkdir -p backups
docker compose exec -T postgres pg_dump -U toyhana_user toyhana | gzip > backups/db-$DATE.sql.gz
# Удаляем дампы старше 14 дней
find backups -name "db-*.sql.gz" -mtime +14 -delete
```

```bash
chmod +x /opt/toyhana/scripts/backup.sh
sudo crontab -e
# Каждый день в 02:00
0 2 * * * /opt/toyhana/scripts/backup.sh
```

### Восстановление из дампа

```bash
gunzip -c backups/db-2026-04-27_0200.sql.gz | docker compose exec -T postgres psql -U toyhana_user -d toyhana
```

### Облачные бэкапы (рекомендуется)

Настройте `rclone` или `restic` на синхронизацию папки `backups/` в S3 / Hetzner Storage Box / Backblaze B2.

---

## 📊 Мониторинг

### Healthcheck

В `Dockerfile` встроен `HEALTHCHECK` — проверяется каждые 30 сек.
```bash
docker compose ps   # статус STATUS должен быть healthy
```

### Внешний uptime-мониторинг

Бесплатно: [UptimeRobot](https://uptimerobot.com).
- Тип: HTTPS
- URL: `https://api.toyhana.kz/dicts/cities`
- Interval: 5 minutes

### Логи

```bash
docker compose logs -f backend       # в реальном времени
docker compose logs --tail=200 backend
docker compose logs nginx
docker compose logs postgres
```

Логи живут только пока живёт контейнер. Для production — настроить journald драйвер или Loki.

---

## 🔧 Конфигурация

### Переменные `.env`

| Переменная | Обязательно | Описание |
|---|---|---|
| `DB_NAME` | да | Имя базы (`toyhana`) |
| `DB_USER` | да | Юзер БД (`toyhana_user`) |
| `DB_PASSWORD` | да | Пароль БД |
| `JWT_SECRET` | да | 32+ hex символов для подписи токенов |
| `TELEGRAM_BOT_TOKEN` | нет | Уведомления админу о новых заявках |
| `TELEGRAM_CHAT_ID` | нет | Куда слать уведомления |
| `TWOGIS_API_KEY` | нет | Для будущей интеграции 2ГИС |

### Меняем секреты

Если `JWT_SECRET` сменить — все существующие токены станут невалидными, юзеры будут заново логиниться. Это нормально.

`DB_PASSWORD` менять сложнее: нужно либо пересоздать том `pgdata`, либо войти в Postgres и сделать `ALTER USER`.

---

## 🚨 Известные нюансы

### Frontend → backend URL

В `toyhana-front/app.json` поле `extra.API_BASE_URL` должно указывать на прод-домен:

```json
{
  "expo": {
    "extra": {
      "API_BASE_URL": "https://api.toyhana.kz"
    }
  }
}
```

### CORS

В `toyhana-back/config.py`:
```python
'cors': {
    'allow_origins': ['*'] if is_dev else [],
}
```

Для production добавьте список доменов клиента (если есть веб-версия). Для мобильного приложения CORS не нужен — мобильные клиенты не подвержены same-origin policy.

### Размер uploads

Том `uploads` растёт по мере загрузки фото залов. На 100 заведений ≈ 200 MB. Когда папка приближается к 5 GB — рассмотрите миграцию на S3.

### Ресурсы контейнеров

Бэк с 2 uvicorn-воркерами на холостом ходу занимает ~150 MB RAM. Postgres — ~80 MB. Nginx — ~10 MB. Итого минимум 1 GB свободно для системы — рекомендую сервер 2-4 GB RAM.

---

## 🆘 Troubleshooting

**Бэк не стартует:**
```bash
docker compose logs backend
# чаще всего — отсутствует или некорректный JWT_SECRET / DB_PASSWORD
```

**Postgres healthcheck failing:**
```bash
docker compose exec postgres pg_isready -U toyhana_user
docker compose logs postgres
```

**SSL: `connection refused on 443`:**
- Проверь файрвол: `sudo ufw status`
- DNS должен резолвить домен на IP сервера
- В `nginx.conf` раскомментирована секция `:443`?

**Uvicorn: `address already in use`:**
- Кто-то уже слушает порт 1500 на хосте? `sudo ss -tlnp | grep 1500`. Не должно быть — мы не пробрасываем 1500 наружу.

---

## 📞 Контакты

При вопросах — Damir ([@DamirKZ82](https://github.com/DamirKZ82))
