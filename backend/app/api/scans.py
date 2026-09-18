import shutil
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from app.api.deps import current_user
from app.core.config import get_settings
from app.models.schemas import CodeScanRequest, GitHubScanRequest, ScanResult
from app.services.github import clone_repository
from app.services.scanner import ScanService
from app.services.storage import EVENTS, SCAN_OWNERS, SCANS
from app.services.uploads import save_and_extract

router = APIRouter(prefix="/scans", tags=["scans"], dependencies=[Depends(current_user)])
service = ScanService()


def _record_event(scan: ScanResult, user: str) -> None:
    EVENTS.append({
        "id": f"SCAN-{scan.scan_id[:8]}",
        "time": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "type": "Scan completed" if scan.status == "completed" else "Scan failed",
        "severity": "HIGH" if scan.findings else "LOW",
        "message": f"{scan.source}: {len(scan.findings)} finding(s) detected.",
        "user": user,
    })


@router.post("/upload", response_model=ScanResult)
async def upload_scan(file: UploadFile = File(...), user: str = Depends(current_user)) -> ScanResult:
    source = await save_and_extract(file)
    try:
        result = await run_in_threadpool(service.run_scan, source, file.filename or "upload")
        SCAN_OWNERS[result.scan_id] = user
        _record_event(result, user)
        return result
    finally:
        shutil.rmtree(source.parent, ignore_errors=True)


@router.post("/code", response_model=ScanResult)
async def code_scan(payload: CodeScanRequest, user: str = Depends(current_user)) -> ScanResult:
    root = get_settings().work_dir / ("snippet-" + uuid4().hex)
    source = root / "source"
    source.mkdir(parents=True)
    try:
        (source / payload.filename).write_text(payload.code, encoding="utf-8")
        result = await run_in_threadpool(service.run_scan, source, payload.filename)
        SCAN_OWNERS[result.scan_id] = user
        _record_event(result, user)
        return result
    finally:
        shutil.rmtree(root, ignore_errors=True)


@router.post("/github", response_model=ScanResult)
def github_scan(payload: GitHubScanRequest, user: str = Depends(current_user)) -> ScanResult:
    source = clone_repository(str(payload.repository_url), payload.branch)
    try:
        result = service.run_scan(source, str(payload.repository_url))
        SCAN_OWNERS[result.scan_id] = user
        _record_event(result, user)
        return result
    finally:
        shutil.rmtree(source.parent, ignore_errors=True)


@router.get("/{scan_id}", response_model=ScanResult)
def get_scan(scan_id: str, user: str = Depends(current_user)) -> ScanResult:
    result = SCANS.get(scan_id)
    if not result or SCAN_OWNERS.get(scan_id) != user:
        raise HTTPException(status_code=404, detail="Scan not found")
    return result
