import os
import re
import shutil
import subprocess
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException

from app.core.config import get_settings

GITHUB_RE = re.compile(r"^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/?$")


def clone_repository(repository_url: str, branch: str | None = None) -> Path:
    if not GITHUB_RE.match(repository_url):
        raise HTTPException(status_code=400, detail="Only canonical GitHub repository URLs are allowed")

    root = get_settings().work_dir / uuid4().hex
    target = root / "repo"
    command = ["git", "clone", "--depth", "1", "--no-tags"]
    if branch:
        command.extend(["--branch", branch])
    command.extend([repository_url.rstrip("/"), str(target)])

    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"

    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
            env=env,
        )
    except subprocess.TimeoutExpired as exc:
        shutil.rmtree(root, ignore_errors=True)
        raise HTTPException(status_code=504, detail="Repository clone timed out") from exc

    if completed.returncode != 0:
        shutil.rmtree(root, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Unable to clone repository")

    return target
