from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Travel Planning & Experience Engine"
    debug: bool = False

    # Database — Cloud SQL uses unix socket on Cloud Run
    database_url: str = "postgresql+asyncpg://travel:travel@localhost:5432/traveldb"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    # AI
    anthropic_api_key: str = ""
    gemini_api_key: str = ""

    # Google APIs
    google_maps_api_key: str = ""
    google_client_id: str = ""
    google_places_api_key: str = ""

    # Other
    amadeus_client_id: str = ""
    amadeus_client_secret: str = ""
    openweather_api_key: str = ""

    # Cloud Run: Cloud SQL unix socket
    cloud_sql_connection_name: str = ""

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
