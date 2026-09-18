from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import current_user
from app.models.schemas import CodeScanRequest, GitHubScanRequest, ScanResult
from app.services.github import clone_repository
from app.services.scanner import ScanService
from app.services.storage import SCAN_OWNERS, SCANS
from app.services.uploads import save_and_extract

router = APIRouter(prefix="/scans", tags=["scans"], dependencies=[Depends(current_user)])
service = ScanService()


@router.post("/upload", response_model=ScanResult)
async def upload_scan(file: UploadFile = File(...), user: str = Depends(current_user)) -> ScanResult:
    source = await save_and_extract(file)
    result = service.run_scan(source, file.filename or "upload")
    SCAN_OWNERS[result.scan_id] = user
    return result


@router.post("/code", response_model=ScanResult)
async def code_scan(payload: CodeScanRequest, user: str = Depends(current_user)) -> ScanResult:
    import shutil
    from uuid import uuid4
    from app.core.config import get_settings

    root = get_settings().work_dir / ("snippet-" + uuid4().hex)
    source = root / "source"
    source.mkdir(parents=True)
    try:
        (source / payload.filename).write_text(payload.code, encoding="utf-8")
        result = service.run_scan(source, payload.filename)
        SCAN_OWNERS[result.scan_id] = user
        return result
    finally:
        shutil.rmtree(root, ignore_errors=True)


@router.post("/github", response_model=ScanResult)
def github_scan(payload: GitHubScanRequest, user: str = Depends(current_user)) -> ScanResult:
    source = clone_repository(str(payload.repository_url), payload.branch)
    result = service.run_scan(source, str(payload.repository_url))
    SCAN_OWNERS[result.scan_id] = user
    return result


@router.get("/{scan_id}", response_model=ScanResult)
def get_scan(scan_id: str, user: str = Depends(current_user)) -> ScanResult:
    result = SCANS.get(scan_id)
    if not result:
        raise HTTPException(status_code=404, detail="Scan not found")
    if SCAN_OWNERS.get(scan_id) != user:
        raise HTTPException(status_code=404, detail="Scan not found")
    return result
