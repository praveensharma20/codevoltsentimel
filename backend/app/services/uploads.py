import shutil
import tarfile
import zipfile
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from app.core.config import get_settings

ALLOWED_SUFFIXES = {".zip", ".tar", ".gz", ".tgz"}


async def save_and_extract(upload: UploadFile) -> Path:
    settings = get_settings()
    filename = Path(upload.filename or "").name
    if not filename or not any(filename.endswith(suffix) for suffix in ALLOWED_SUFFIXES):
        raise HTTPException(status_code=400, detail="Upload must be a zip or tar archive")
    target = settings.work_dir / uuid4().hex
    archive = target / filename
    source = target / "source"
    target.mkdir(parents=True)
    size = 0
    with archive.open("wb") as output:
        while chunk := await upload.read(1024 * 1024):
            size += len(chunk)
            if size > settings.max_upload_bytes:
                raise HTTPException(status_code=413, detail="Upload is too large")
            output.write(chunk)
    source.mkdir()
    _extract_safely(archive, source)
    return source


def _extract_safely(archive: Path, destination: Path) -> None:
    settings = get_settings()
    total = 0
    if zipfile.is_zipfile(archive):
        with zipfile.ZipFile(archive) as zip_archive:
            for member in zip_archive.infolist():
                total += member.file_size
                _validate_member(destination, member.filename, total, settings.max_extracted_bytes)
            zip_archive.extractall(destination)
        return
    if tarfile.is_tarfile(archive):
        with tarfile.open(archive) as tar_archive:
            for member in tar_archive.getmembers():
                total += member.size
                _validate_member(destination, member.name, total, settings.max_extracted_bytes)
            tar_archive.extractall(destination, filter="data")
        return
    shutil.rmtree(destination.parent, ignore_errors=True)
    raise HTTPException(status_code=400, detail="Unsupported or corrupted archive")


def _validate_member(destination: Path, name: str, total: int, max_total: int) -> None:
    resolved = (destination / name).resolve()
    if not str(resolved).startswith(str(destination.resolve())):
        raise HTTPException(status_code=400, detail="Archive contains unsafe paths")
    if total > max_total:
        raise HTTPException(status_code=413, detail="Extracted content is too large")
