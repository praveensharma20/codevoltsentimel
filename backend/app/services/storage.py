from collections import deque

from app.models.schemas import ScanResult

USERS: dict[str, str] = {}
SCANS: dict[str, ScanResult] = {}
SCAN_OWNERS: dict[str, str] = {}
EVENTS: deque[dict] = deque(maxlen=100)
