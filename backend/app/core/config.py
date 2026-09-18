from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "CodeVolt Sentinel"
    jwt_secret: str = Field(default="", min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = Field(default=60, ge=5, le=1440)
    max_upload_bytes: int = Field(default=25 * 1024 * 1024, ge=1)
    max_extracted_bytes: int = Field(default=80 * 1024 * 1024, ge=1)
    scanner_timeout_seconds: int = Field(default=180, ge=10, le=900)
    work_dir: Path = Path("/tmp/secure-review")
    semgrep_config: str = "p/security-audit,p/secrets,p/python,p/javascript,p/typescript,p/react"

    @field_validator("jwt_secret")
    @classmethod
    def require_secure_jwt_secret(cls, value: str) -> str:
        if not value or value in {"supersecretkey123", "change-me-in-production"}:
            raise ValueError("JWT_SECRET must be set to a strong secret of at least 32 characters")
        return value

    @field_validator("max_extracted_bytes")
    @classmethod
    def extracted_limit_must_cover_upload(cls, value: int, info):
        upload_limit = info.data.get("max_upload_bytes")
        if upload_limit is not None and value < upload_limit:
            raise ValueError("MAX_EXTRACTED_BYTES must be >= MAX_UPLOAD_BYTES")
        return value


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.work_dir.mkdir(parents=True, exist_ok=True)
    return settings
