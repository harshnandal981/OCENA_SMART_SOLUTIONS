from pathlib import Path

from dotenv import load_dotenv
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE_PATH = BACKEND_DIR / ".env"

load_dotenv(ENV_FILE_PATH)


class Settings(BaseSettings):
    log_level: str = "INFO"
    supabase_url: str = Field(validation_alias=AliasChoices("SUPABASE_URL"))
    supabase_service_role_key: str = Field(
        validation_alias=AliasChoices("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_KEY")
    )
    gemini_api_key: str = Field(validation_alias=AliasChoices("GEMINI_API_KEY"))
    gemini_model: str = "gemini-2.5-flash"
    gemini_image_model: str = "gemini-2.0-flash-preview-image-generation"
    frontend_url: str = "http://localhost:5173"
    unsplash_access_key: str | None = None
    supabase_storage_bucket: str = "course-thumbnails"

    model_config = SettingsConfigDict(
        env_file=ENV_FILE_PATH,
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
