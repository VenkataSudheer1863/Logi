from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Groq
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # Database
    database_url: str = "sqlite+aiosqlite:///./wms.db"
    sync_database_url: str = "sqlite:///./wms.db"

    # Auth
    secret_key: str = "change-me-in-production-super-secret-key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # App
    app_name: str = "Maersk WMS"
    log_level: str = "INFO"
    data_dir: str = "./data"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
