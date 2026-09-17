import json
import shutil
import subprocess
from pathlib import Path
from uuid import uuid4

from app.core.config import get_settings
from app.models.schemas import Finding, ScanResult, Severity
from app.services.storage import SCANS

SEVERITY_MAP = {"ERROR": Severity.high, "WARNING": Severity.medium, "INFO": Severity.low, "HIGH": Severity.high, "MEDIUM": Severity.medium, "LOW": Severity.low}


class ScanService:
    def run_scan(self, source_path: Path, source_label: str) -> ScanResult:
        scan_id = uuid4().hex
        result = ScanResult(scan_id=scan_id, status="running", source=source_label)
        SCANS[scan_id] = result
        findings: list[Finding] = []
        findings.extend(self._run_semgrep(source_path))
        findings.extend(self._run_bandit(source_path))
        findings.extend(self._fallback_secret_scan(source_path))
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
        command = ["semgrep", "--json", "--config", settings.semgrep_config, str(source_path)]
        completed = subprocess.run(command, capture_output=True, text=True, timeout=settings.scanner_timeout_seconds, check=False)
        data = json.loads(completed.stdout or "{}")
        findings = []
        for item in data.get("results", []):
            extra = item.get("extra", {})
            findings.append(Finding(
                id=item.get("check_id", uuid4().hex), tool="semgrep", category=_category(item.get("check_id", "")),
                file_path=str(Path(item.get("path", "")).relative_to(source_path)) if str(item.get("path", "")).startswith(str(source_path)) else item.get("path", ""),
                line_number=item.get("start", {}).get("line", 1), severity=SEVERITY_MAP.get(str(extra.get("severity", "WARNING")).upper(), Severity.medium),
                confidence=str(extra.get("metadata", {}).get("confidence", "medium")).lower() if str(extra.get("metadata", {}).get("confidence", "medium")).lower() in {"high", "medium", "low"} else "medium",
                explanation=extra.get("message", "Potential security issue detected by Semgrep."),
                fix_recommendation=extra.get("metadata", {}).get("fix", "Review the data flow, validate input, encode output, and use safe framework APIs."),
                code=extra.get("lines")))
        return findings

    def _run_bandit(self, source_path: Path) -> list[Finding]:
        if not shutil.which("bandit"):
            return []
        command = ["bandit", "-r", str(source_path), "-f", "json"]
        completed = subprocess.run(command, capture_output=True, text=True, timeout=get_settings().scanner_timeout_seconds, check=False)
        data = json.loads(completed.stdout or "{}")
        return [Finding(
            id=item.get("test_id", uuid4().hex), tool="bandit", category=_category(item.get("test_name", "")),
            file_path=str(Path(item.get("filename", "")).relative_to(source_path)) if str(item.get("filename", "")).startswith(str(source_path)) else item.get("filename", ""),
            line_number=item.get("line_number", 1), severity=SEVERITY_MAP.get(str(item.get("issue_severity", "MEDIUM")).upper(), Severity.medium),
            confidence=str(item.get("issue_confidence", "medium")).lower() if str(item.get("issue_confidence", "medium")).lower() in {"high", "medium", "low"} else "medium",
            explanation=item.get("issue_text", "Potential Python security issue detected by Bandit."),
            fix_recommendation="Prefer safe standard-library or framework alternatives and remove the insecure pattern.", code=item.get("code"))
            for item in data.get("results", [])]

    def _fallback_secret_scan(self, source_path: Path) -> list[Finding]:
        needles = ("password=", "api_key=", "secret=", "token=")
        findings = []
        for path in source_path.rglob("*"):
            if path.is_file() and path.stat().st_size < 1024 * 1024:
                for number, line in enumerate(path.read_text(errors="ignore").splitlines(), start=1):
                    if any(needle in line.lower().replace(" ", "") for needle in needles):
                        findings.append(Finding(id=f"secret-{uuid4().hex}", tool="platform", category="hardcoded-credentials", file_path=str(path.relative_to(source_path)), line_number=number, severity=Severity.high, confidence="medium", explanation="Possible hardcoded credential detected.", fix_recommendation="Move secrets to a managed secret store and rotate exposed values.", code=line.strip()))
        return findings


def _category(value: str) -> str:
    lower = value.lower()
    if "sql" in lower: return "sql-injection"
    if "xss" in lower or "cross" in lower: return "xss"
    if "secret" in lower or "password" in lower or "credential" in lower: return "hardcoded-credentials"
    if "assert" in lower or "logic" in lower: return "logical-error"
    return "insecure-pattern"
