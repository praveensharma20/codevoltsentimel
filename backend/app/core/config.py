from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


DEFAULT_JWT_SECRET = "change-me-in-production"


class Settings(BaseSettings):
    app_name: str = "CodeVolt Sentinel"
    jwt_secret: str = "supersecretkey123"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    max_upload_bytes: int = 25 * 1024 * 1024
    max_extracted_bytes: int = 80 * 1024 * 1024
    scanner_timeout_seconds: int = 180
    work_dir: Path = Path("/tmp/secure-review")
    semgrep_config: str = "p/security-audit,p/secrets,p/python,p/javascript,p/typescript,p/react"

    @field_validator("jwt_secret")
    @classmethod
    def require_production_jwt_secret(cls, value: str) -> str:
        if value == DEFAULT_JWT_SECRET:
            raise ValueError("JWT_SECRET must be changed from the documented placeholder")
        return value


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.work_dir.mkdir(parents=True, exist_ok=True)
    return settings
