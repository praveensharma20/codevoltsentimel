from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class Severity(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"
    info = "info"


class UserCreate(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=12, max_length=128)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CodeScanRequest(BaseModel):
    code: str = Field(min_length=1, max_length=200_000)
    filename: str = Field(default="snippet.txt", max_length=255, pattern=r"^[A-Za-z0-9_.-]+$")


class GitHubScanRequest(BaseModel):
    repository_url: HttpUrl
    branch: str | None = Field(default=None, max_length=128, pattern=r"^[A-Za-z0-9._/-]+$")


class Finding(BaseModel):
    id: str
    tool: Literal["semgrep", "bandit", "platform"]
    category: str
    file_path: str
    line_number: int
    severity: Severity
    confidence: Literal["high", "medium", "low"] = "medium"
    explanation: str
    fix_recommendation: str
    code: str | None = None


class ScanResult(BaseModel):
    scan_id: str
    status: Literal["queued", "running", "completed", "failed"]
    source: str
    findings: list[Finding] = Field(default_factory=list)
    summary: dict[str, int] = Field(default_factory=dict)
    error: str | None = None
