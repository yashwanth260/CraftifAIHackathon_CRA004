from datetime import datetime

def test_pipeline_adapter_valid_event(client):
    event = {
        "event_id": "pipegen_auto_test_1",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "source_id": "cam_line_3",
        "track_id": 99,
        "event_type": "ZONE_AND_PPE_VIOLATION",
        "zone_id": "zone_hazardous",
        "severity": "CRITICAL",
        "confidence": 0.89,
        "ppe_status": "NON_COMPLIANT",
        "explanation": "Simultaneous zone breach and missing helmet",
        "model_name": "pipegen_edge",
        "inference_mode": "PIPEGEN"
    }

    resp = client.post("/api/pipeline/events", json=event)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "INGESTED"
    assert data["incident_id"] == "pipegen_auto_test_1"

def test_pipeline_adapter_rejects_malformed_event(client):
    malformed = {
        "event_id": "broken_01",
        "timestamp": "not-a-valid-date",
        "source_id": "cam_broken",
        "event_type": "INVALID_TYPE_STRING"
    }
    resp = client.post("/api/pipeline/events", json=malformed)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "MALFORMED"
    assert "Schema validation failed" in data["message"]

def test_pipeline_status_reporting(client):
    resp = client.get("/api/pipeline/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "adapter_status" in data
    assert "total_events_received" in data
