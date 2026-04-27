"""
Автоматическая сборка роутеров из папки routers/.

Правила:
- Файлы с префиксом r{число} подхватываются автоматически.
- Каждый файл должен экспортировать переменную `router = APIRouter(prefix=...)`.
- Порядок регистрации — по алфавиту имён файлов (r01 → r02 → r05 → r20 → ...).
- Ничего регистрировать вручную в main.py не надо.
"""
import importlib
import pathlib
import re

from fastapi import FastAPI

from libs.date import get_timestamp_now


ROUTER_FILE_PATTERN = re.compile(r'^r\d+_[a-zA-Z0-9_]+\.py$')


def setup_routes(app: FastAPI):
    routers_dir = pathlib.Path(__file__).resolve().parent.parent / 'routers'
    if not routers_dir.exists():
        print(f"[{get_timestamp_now()}] ⚠️ Routers dir not found: {routers_dir}")
        return

    files = sorted(f.name for f in routers_dir.iterdir()
                   if f.is_file() and ROUTER_FILE_PATTERN.match(f.name))

    loaded = 0
    for filename in files:
        module_name = f"routers.{filename[:-3]}"   # убираем .py
        try:
            module = importlib.import_module(module_name)
            router = getattr(module, 'router', None)
            if router is None:
                print(f"[{get_timestamp_now()}] ⚠️ No `router` in {filename}")
                continue
            app.include_router(router)
            loaded += 1
            print(f"[{get_timestamp_now()}] ✅ Router loaded: {filename}")
        except Exception as err:
            print(f"[{get_timestamp_now()}] ❌ Failed to load {filename}: {err}")
            raise

    print(f"[{get_timestamp_now()}] 📚 Routers total: {loaded}")
