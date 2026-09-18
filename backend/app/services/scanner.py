import json
import logging
import shutil
import subprocess
from json import JSONDecodeError
from pathlib import Path
from uuid import uuid4

from app.core.config import get_settings
from app.models.schemas import Finding, ScanResult, Severity
from app.services.storage import SCANS

logger = logging.getLogger(__name__)

SEVERITY_MAP = {
    "ERROR": Severity.high,
    "WARNING": Severity.medium,
    "INFO": Severity.low,
    "CRITICAL": Severity.critical,
    "HIGH": Severity.high,
    "MEDIUM": Severity.medium,
    "LOW": Severity.low,
}

IGNORED_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__", "dist", "build", ".next"}


class ScanService:
    def run_scan(self, source_path: Path, source_label: str) -> ScanResult:
        scan_id = uuid4().hex
        result = ScanResult(scan_id=scan_id, status="running", source=source_label)
        SCANS[scan_id] = result
        findings: list[Finding] = []

        try:
            findings.extend(self._run_semgrep(source_path))
            findings.extend(self._run_bandit(source_path))
            findings.extend(self._fallback_secret_scan(source_path))
        except Exception as exc:
            logger.exception("Security scan %s failed", scan_id)
            result.status = "failed"
            result.error = "Scanner failed safely; check server logs for details."
            SCANS[scan_id] = result
            return result

        summary: dict[str, int] = {}
        for finding in findings:
            summary[finding.severity.value] = summary.get(finding.severity.value, 0) + 1

        result.status = "completed"
        result.findings = findings
        result.summary = summary
        SCANS[scan_id] = result
        return result

    def _run_semgrep(self, source_path: Path) -> list[Finding]:
        if not shutil.which("semgrep"):
            return []

        settings = get_settings()
        command = ["semgrep", "--json", "--no-git-ignore"]
        for config in (item.strip() for item in settings.semgrep_config.split(",") if item.strip()):
            command.extend(["--config", config])
        command.append(str(source_path))

        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=settings.scanner_timeout_seconds,
            check=False,
        )
        try:
            data = json.loads(completed.stdout or "{}")
        except JSONDecodeError as exc:
            raise RuntimeError("Semgrep returned invalid JSON") from exc
        if completed.returncode not in {0, 1} and not data.get("results"):
            raise RuntimeError("Semgrep scan failed")

        findings: list[Finding] = []
        for item in data.get("results", []):
            extra = item.get("extra", {})
            metadata = extra.get("metadata", {}) or {}
            path = Path(str(item.get("path", "")))
            findings.append(Finding(
                id=f"semgrep-{uuid4().hex}",
                tool="semgrep",
                category=_category(str(item.get("check_id", ""))),
                file_path=_relative_path(path, source_path),
                line_number=int(item.get("start", {}).get("line", 1) or 1),
                severity=SEVERITY_MAP.get(str(extra.get("severity", "WARNING")).upper(), Severity.medium),
                confidence=_confidence(metadata.get("confidence", "medium")),
                explanation=str(extra.get("message", "Potential security issue detected by Semgrep.")),
                fix_recommendation=str(metadata.get("fix", "Review the data flow, validate input, encode output, and use safe framework APIs.")),
                code=extra.get("lines"),
            ))
        return findings

    def _run_bandit(self, source_path: Path) -> list[Finding]:
        if not shutil.which("bandit"):
            return []

        settings = get_settings()
        command = ["bandit", "-r", str(source_path), "-f", "json"]
        try:
            completed = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=settings.scanner_timeout_seconds,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError("Bandit scan timed out") from exc

        try:
            data = json.loads(completed.stdout or "{}")
        except JSONDecodeError as exc:
            raise RuntimeError("Bandit returned invalid JSON") from exc

        if completed.returncode not in {0, 1} and not data.get("results"):
            raise RuntimeError("Bandit scan failed")

        return [
            Finding(
                id=f"bandit-{uuid4().hex}",
                tool="bandit",
                category=_category(str(item.get("test_name", ""))),
                file_path=_relative_path(Path(str(item.get("filename", ""))), source_path),
                line_number=int(item.get("line_number", 1) or 1),
                severity=SEVERITY_MAP.get(str(item.get("issue_severity", "MEDIUM")).upper(), Severity.medium),
                confidence=_confidence(item.get("issue_confidence", "medium")),
                explanation=str(item.get("issue_text", "Potential Python security issue detected by Bandit.")),
                fix_recommendation="Prefer safe standard-library or framework alternatives and remove the insecure pattern.",
                code=item.get("code"),
            )
            for item in data.get("results", [])
        ]

    def _fallback_secret_scan(self, source_path: Path) -> list[Finding]:
        needles = ("password=", "api_key=", "secret=", "token=")
        findings: list[Finding] = []

        for path in source_path.rglob("*"):
            if not path.is_file() or any(part in IGNORED_DIRS for part in path.parts):
                continue
            try:
                if path.stat().st_size >= 1024 * 1024:
                    continue
                text = path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue

            for number, line in enumerate(text.splitlines(), start=1):
                normalized = line.lower().replace(" ", "")
                if any(needle in normalized for needle in needles):
                    findings.append(Finding(
                        id=f"secret-{uuid4().hex}",
                        tool="platform",
                        category="hardcoded-credentials",
                        file_path=str(path.relative_to(source_path)),
                        line_number=number,
                        severity=Severity.high,
                        confidence="medium",
                        explanation="Possible hardcoded credential detected.",
                        fix_recommendation="Move secrets to a managed secret store and rotate exposed values.",
                        code=line.strip(),
                    ))
        return findings


def _relative_path(path: Path, source_path: Path) -> str:
    try:
        return str(path.resolve().relative_to(source_path.resolve()))
    except ValueError:
        return str(path)


def _confidence(value: object) -> str:
    normalized = str(value).lower()
    return normalized if normalized in {"high", "medium", "low"} else "medium"


def _category(value: str) -> str:
    lower = value.lower()
    if "sql" in lower:
        return "sql-injection"
    if "xss" in lower or "cross" in lower:
        return "xss"
    if "secret" in lower or "password" in lower or "credential" in lower:
        return "hardcoded-credentials"
    if "assert" in lower or "logic" in lower:
        return "logical-error"
    return "insecure-pattern"
