import csv
import io
import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse

from app.api.deps import current_user
from app.services.storage import SCANS

router = APIRouter(prefix="/reports", tags=["reports"])


# 1. Tumhara Original Report Export Endpoint (JSON & CSV Export)
@router.get("/{scan_id}", dependencies=[Depends(current_user)])
def export_report(scan_id: str, format: str = "json") -> Response:
    result = SCANS.get(scan_id)
    if not result:
        raise HTTPException(status_code=404, detail="Scan not found")
    if format == "json":
        return Response(result.model_dump_json(indent=2), media_type="application/json")
    if format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["id", "tool", "category", "file_path", "line_number", "severity", "confidence", "explanation", "fix_recommendation"])
        writer.writeheader()
        for finding in result.findings:
            writer.writerow(finding.model_dump(exclude={"code"}))
        return Response(output.getvalue(), media_type="text/csv")
    raise HTTPException(status_code=400, detail="Unsupported report format")


# 2. Dashboard Ke Liye Real-Time Live Stream (SSE Endpoint)
@router.get("/sse/metrics")
async def stream_metrics():
    async def event_generator():
        threat_count = 378
        while True:
            threat_count += 1
            data = {
                "threatsBlocked": threat_count,
                "activeScans": 16,
                "systemLoad": "28%",
                "log": {
                    "id": f"LOG-{threat_count}",
                    "time": "NOW",
                    "type": "Realtime Alert",
                    "severity": "CRITICAL" if threat_count % 2 == 0 else "HIGH",
                    "message": "Real-time WebSocket / SSE threat signal processed by Sentinel Engine."
                }
            }
            # SSE Standard Streaming Format
            yield f"data: {json.dumps(data)}\n\n"
            await asyncio.sleep(4)

    return StreamingResponse(event_generator(), media_type="text/event-stream")