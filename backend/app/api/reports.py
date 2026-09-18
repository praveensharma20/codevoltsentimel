import asyncio
import csv
import io
import json

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse

from app.api.deps import current_user
from app.services.storage import EVENTS, SCAN_OWNERS, SCANS

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/sse/metrics")
async def stream_metrics(user: str = Depends(current_user)):
    async def event_generator():
        last_event_id: str | None = None
        while True:
            owned_scan_ids = [scan_id for scan_id, owner in SCAN_OWNERS.items() if owner == user]
            owned_scans = [SCANS[scan_id] for scan_id in owned_scan_ids if scan_id in SCANS]
            findings = sum(len(scan.findings) for scan in owned_scans)
            active = sum(scan.status in {"queued", "running"} for scan in owned_scans)
            completed = sum(scan.status == "completed" for scan in owned_scans)
            failed = sum(scan.status == "failed" for scan in owned_scans)

            latest_event = next((event for event in reversed(EVENTS) if event.get("user") == user), None)
            payload = {
                "totalFindings": findings,
                "activeScans": active,
                "completedScans": completed,
                "failedScans": failed,
            }
            if latest_event and latest_event.get("id") != last_event_id:
                payload["log"] = latest_event
                last_event_id = str(latest_event.get("id"))

            yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(4)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/{scan_id}")
def export_report(scan_id: str, format: str = "json", user: str = Depends(current_user)) -> Response:
    result = SCANS.get(scan_id)
    if not result or SCAN_OWNERS.get(scan_id) != user:
        raise HTTPException(status_code=404, detail="Scan not found")

    if format == "json":
        return Response(result.model_dump_json(indent=2), media_type="application/json")

    if format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            fieldnames=["id", "tool", "category", "file_path", "line_number", "severity", "confidence", "explanation", "fix_recommendation"],
        )
        writer.writeheader()
        for finding in result.findings:
            writer.writerow(finding.model_dump(exclude={"code"}))
        return Response(output.getvalue(), media_type="text/csv")

    raise HTTPException(status_code=400, detail="Unsupported report format")
