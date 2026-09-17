from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import current_user
from app.models.schemas import GitHubScanRequest, ScanResult
from app.services.github import clone_repository
from app.services.scanner import ScanService
from app.services.storage import SCANS
from app.services.uploads import save_and_extract

router = APIRouter(prefix="/scans", tags=["scans"], dependencies=[Depends(current_user)])
service = ScanService()


@router.post("/upload", response_model=ScanResult)
async def upload_scan(file: UploadFile = File(...)) -> ScanResult:
    source = await save_and_extract(file)
    return service.run_scan(source, file.filename or "upload")


@router.post("/github", response_model=ScanResult)
def github_scan(payload: GitHubScanRequest) -> ScanResult:
    source = clone_repository(str(payload.repository_url), payload.branch)
    return service.run_scan(source, str(payload.repository_url))


@router.get("/{scan_id}", response_model=ScanResult)
def get_scan(scan_id: str) -> ScanResult:
    result = SCANS.get(scan_id)
    if not result:
        raise HTTPException(status_code=404, detail="Scan not found")
    return result
