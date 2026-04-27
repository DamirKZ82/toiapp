"""
Подключение к PostgreSQL.
Пул инициализируется один раз в lifespan FastAPI.
Единственная функция для запросов — query_db.
"""
import asyncpg
from typing import Optional

from config import config
from libs.date import get_timestamp_now


_pool: Optional[asyncpg.Pool] = None


async def init_db():
    """Создаёт пул соединений. Вызывается в lifespan при старте."""
    global _pool
    db = config['db']
    _pool = await asyncpg.create_pool(
        host=db['host'],
        port=db['port'],
        database=db['name'],
        user=db['user'],
        password=db['password'],
        min_size=db['min_size'],
        max_size=db['max_size'],
    )
    print(f"[{get_timestamp_now()}] ✅ DB pool ready: {db['host']}:{db['port']}/{db['name']}")


async def close_db():
    """Закрывает пул. Вызывается в lifespan при остановке."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        print(f"[{get_timestamp_now()}] 🛑 DB pool closed")


async def query_db(sql: str):
    """
    Выполнить SQL.
    - SELECT / RETURNING  -> список словарей (может быть пустым)
    - INSERT/UPDATE/DELETE без RETURNING -> None

    При любом падении asyncpg выбрасывает ErrorException(err, sql),
    которое глобальный хендлер ловит и сохраняет в errors_back с полным контекстом.
    """
    if _pool is None:
        raise RuntimeError('DB pool is not initialized')

    # Импорт внутри функции — чтобы избежать циклической зависимости
    # (h01_errors импортирует libs, а мы здесь — handlers).
    from handlers.h01_errors import ErrorException

    try:
        async with _pool.acquire() as conn:
            sql_upper = sql.strip().upper()
            is_select = sql_upper.startswith('SELECT') or 'RETURNING' in sql_upper
            if is_select:
                rows = await conn.fetch(sql)
                return [dict(row) for row in rows]
            await conn.execute(sql)
            return None
    except ErrorException:
        # Уже наше — пробрасываем как есть
        raise
    except Exception as err:
        raise ErrorException(err=err, sql=sql)


class _TxRunner:
    """
    Объект, который можно передать в transaction-аware функции.
    У него есть метод query() с той же семантикой, что и у глобального query_db,
    но работает на конкретном соединении внутри транзакции.
    """
    def __init__(self, conn: asyncpg.Connection):
        self._conn = conn

    async def query(self, sql: str):
        from handlers.h01_errors import ErrorException
        try:
            sql_upper = sql.strip().upper()
            is_select = sql_upper.startswith('SELECT') or 'RETURNING' in sql_upper
            if is_select:
                rows = await self._conn.fetch(sql)
                return [dict(row) for row in rows]
            await self._conn.execute(sql)
            return None
        except ErrorException:
            raise
        except Exception as err:
            raise ErrorException(err=err, sql=sql)


class transaction:
    """
    Контекстный менеджер для транзакции.

        async with transaction() as tx:
            await tx.query(f"INSERT ... ")
            await tx.query(f"UPDATE ... ")

    Если внутри with поднимется исключение — транзакция откатывается.
    """
    def __init__(self):
        self._conn = None
        self._tx = None
        self._acquire_ctx = None

    async def __aenter__(self):
        if _pool is None:
            raise RuntimeError('DB pool is not initialized')
        self._acquire_ctx = _pool.acquire()
        self._conn = await self._acquire_ctx.__aenter__()
        self._tx = self._conn.transaction()
        await self._tx.start()
        return _TxRunner(self._conn)

    async def __aexit__(self, exc_type, exc, tb):
        try:
            if exc_type is None:
                await self._tx.commit()
            else:
                await self._tx.rollback()
        finally:
            await self._acquire_ctx.__aexit__(exc_type, exc, tb)
