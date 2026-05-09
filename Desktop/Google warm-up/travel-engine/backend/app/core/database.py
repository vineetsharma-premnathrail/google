from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import get_settings

settings = get_settings()


def _build_db_url() -> str:
    conn = settings.cloud_sql_connection_name
    if conn:
        # asyncpg unix socket: host param points to Cloud SQL socket dir
        socket_dir = f"/cloudsql/{conn}"
        db_url = settings.database_url
        # Strip any existing host/port and rewrite with unix socket query param
        import re
        # Extract user:pass from the URL
        match = re.match(r"postgresql\+asyncpg://([^@]+)@.*", db_url)
        creds = match.group(1) if match else "traveluser"
        return f"postgresql+asyncpg://{creds}@/traveldb?host={socket_dir}"
    return settings.database_url


engine = create_async_engine(_build_db_url(), echo=settings.debug)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Add columns introduced after initial schema creation
        for sql in [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR",
        ]:
            await conn.execute(__import__("sqlalchemy").text(sql))
