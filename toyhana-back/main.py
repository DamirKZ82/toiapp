"""
Точка входа. Содержит только:
- lifespan (init/close DB, миграции, сиды)
- создание FastAPI
- подключение handlers (ошибки, CORS, автосборка роутеров)
"""
from contextlib import asynccontextmanager
import pathlib

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles

from config import config
from connections.connect_postgres import init_db, close_db
from handlers.h01_errors import (
    WarnException,
    ErrorException,
    warn_handler,
    error_handler,
    unhandled_handler,
    validation_handler,
)
from handlers.h02_cors import setup_cors
from handlers.h04_routes import setup_routes
from libs.date import get_timestamp_now
from services.seed import apply_migrations, seed_all


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Запуск ---
    await init_db()
    await apply_migrations()
    await seed_all()
    print(f"[{get_timestamp_now()}] 🚀 Server started on port {config['port']} (env={config['env']})")
    yield
    # --- Остановка ---
    await close_db()
    print(f"[{get_timestamp_now()}] 🛑 Server stopped")


app = FastAPI(
    title='ToiApp API',
    version='0.1.0',
    lifespan=lifespan,
)

# Middleware
setup_cors(app)

# Глобальные хендлеры исключений
app.add_exception_handler(WarnException, warn_handler)
app.add_exception_handler(ErrorException, error_handler)
app.add_exception_handler(RequestValidationError, validation_handler)
app.add_exception_handler(Exception, unhandled_handler)

# Автосборка роутеров из routers/
setup_routes(app)

# Раздача загруженных фото. В dev — через FastAPI (удобно).
# В prod — лучше отдавать nginx-ом; этот mount можно оставить, он будет просто не задействован.
_uploads_dir = pathlib.Path(config['uploads']['root']).resolve()
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount('/uploads', StaticFiles(directory=str(_uploads_dir)), name='uploads')


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('main:app', host='0.0.0.0', port=config['port'], reload=config['env'] == 'dev')
