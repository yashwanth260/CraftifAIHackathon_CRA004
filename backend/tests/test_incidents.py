from datetime import datetime

def test_incident_lifecycle_and_audit(client):
    # Ingest a valid event via pipeline endpoint to create an incident
    event = {
        "event_id": "test_inc_001",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "source_id": "camera_warehouse_01",
        "track_id": 5,
        "event_type": "RESTRICTED_ZONE_VIOLATION",
        "zone_id": "zone_assembly_1",
        "severity": "HIGH",
        "confidence": 0.92,
        "ppe_status": "NOT_EVALUATED",
        "explanation": "Worker detected in high hazard zone",
        "model_name": "yolov8n",
        "inference_mode": "REAL"
    }

    create_resp = client.post("/api/pipeline/events", json=event)
    assert create_resp.status_code == 200
    assert create_resp.json()["status"] == "INGESTED"

    # List incidents
    list_resp = client.get("/api/incidents")
    assert list_resp.status_code == 200
    incidents = list_resp.json()
    assert len(incidents) >= 1
    target = next((i for i in incidents if i["id"] == "test_inc_001"), None)
    assert target is not None
    assert target["status"] == "NEW"

    # Transition status to UNDER_REVIEW
    update_resp = client.patch(
        "/api/incidents/test_inc_001",
        json={"status": "UNDER_REVIEW", "resolution_notes": "Supervisor notified."}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "UNDER_REVIEW"

    # Get single incident details with audit logs
    detail_resp = client.get("/api/incidents/test_inc_001")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["incident"]["status"] == "UNDER_REVIEW"
    assert len(detail["audit_logs"]) >= 1

    # Transition to RESOLVED
    res_resp = client.patch(
        "/api/incidents/test_inc_001",
        json={"status": "RESOLVED", "resolution_notes": "Area cleared."}
    )
    assert res_resp.status_code == 200
    assert res_resp.json()["status"] == "RESOLVED"

def test_incident_csv_export(client):
    resp = client.get("/api/incidents/export.csv")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    csv_text = resp.text
    assert "Incident ID,Timestamp (UTC),Event Type,Severity,Status" in csv_text
