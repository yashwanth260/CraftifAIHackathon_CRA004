import uuid
import threading
from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from backend.app.database import get_db, SessionLocal
from backend.app.services.pipeline_adapter import pipegen_adapter
from backend.app.schemas.pipeline import PipeGenStatusResponse
from pipegen.pipegen_pipeline import run_pipeline

router = APIRouter()

@router.get("/pipeline/status", response_model=PipeGenStatusResponse)
def get_pipeline_status():
    return pipegen_adapter.get_status()

@router.post("/pipeline/connect")
def connect_pipeline():
    """Explicitly connects the PipeGen pipeline adapter."""
    return pipegen_adapter.connect()

@router.post("/pipeline/disconnect")
def disconnect_pipeline():
    """Disconnects the PipeGen pipeline adapter."""
    return pipegen_adapter.disconnect()

@router.post("/pipeline/test-event")
def send_test_pipeline_event(db: Session = Depends(get_db)):
    """Generates and ingests a live test event from the PipeGen edge specification."""
    test_event = {
        "event_id": f"pipegen_live_{uuid.uuid4().hex[:10]}",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "source_id": "camera_pipegen_edge_01",
        "track_id": 42,
        "event_type": "RESTRICTED_ZONE_VIOLATION",
        "zone_id": "zone_welding_cell_primary",
        "severity": "HIGH",
        "confidence": 0.95,
        "ppe_status": "NOT_EVALUATED",
        "explanation": "Operator entered restricted welding cell perimeter. Dwell time 1.4s.",
        "model_name": "yolov8n",
        "inference_mode": "PIPEGEN"
    }
    return pipegen_adapter.ingest_event(db, test_event)

@router.post("/pipeline/run-live")
def trigger_live_pipeline_run():
    """Runs the PipeGen edge vision pipeline in a background thread."""
    def worker():
        try:
            run_pipeline(
                video_source="",
                max_frames=60,
                api_endpoint="http://127.0.0.1:8000/api/pipeline/events"
            )
        except Exception as e:
            print(f"PipeGen runner error: {e}")

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()
    return {"status": "LAUNCHED", "message": "PipeGen edge pipeline is running in background"}

@router.post("/pipeline/events")
def ingest_pipeline_events(
    payload: Any = Body(...),
    db: Session = Depends(get_db)
):
    """
    Ingests structured safety events from CraftifAI PipeGen edge computer-vision pipeline.
    Accepts single event JSON or list of events.
    """
    if isinstance(payload, list):
        results = [pipegen_adapter.ingest_event(db, ev) for ev in payload]
        return {"status": "BATCH_PROCESSED", "count": len(results), "results": results}
    elif isinstance(payload, dict):
        res = pipegen_adapter.ingest_event(db, payload)
        return res
    else:
        return {"status": "MALFORMED", "message": "Payload must be a JSON object or array"}
