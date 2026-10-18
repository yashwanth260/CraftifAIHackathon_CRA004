import uuid
import json
from typing import Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.app.models.zone import RestrictedZone
from backend.app.models.incident import Incident
from backend.app.models.audit import AuditLog

def load_demo_data(db: Session) -> Dict[str, Any]:
    """
    Seeds comprehensive industrial safety demo records:
    - 2 Sample Restricted Zones
    - 6 Realistic Incidents across various severities, statuses, and types
    - Associated Audit Trails
    All records explicitly tagged with is_demo=True.
    """
    # 1. Clear any existing demo records first to avoid duplicates
    clear_demo_data(db)

    # 2. Seed Sample Zones if not present
    zone1_coords = [
        {"x": 0.45, "y": 0.30},
        {"x": 0.88, "y": 0.30},
        {"x": 0.90, "y": 0.82},
        {"x": 0.42, "y": 0.80}
    ]
    zone2_coords = [
        {"x": 0.10, "y": 0.40},
        {"x": 0.38, "y": 0.40},
        {"x": 0.38, "y": 0.90},
        {"x": 0.08, "y": 0.90}
    ]

    z1 = RestrictedZone(
        id="zone_demo_welding_cell",
        name="Automated Robotic Cell #3",
        polygon_coords=json.dumps(zone1_coords),
        color="#ef4444",
        severity="CRITICAL",
        is_active=True,
        dwell_time_seconds=1.5,
        required_ppe=json.dumps(["HELMET", "VEST"])
    )

    z2 = RestrictedZone(
        id="zone_demo_forklift_lane",
        name="High-Speed Forklift Transit Lane",
        polygon_coords=json.dumps(zone2_coords),
        color="#f97316",
        severity="HIGH",
        is_active=True,
        dwell_time_seconds=2.0,
        required_ppe=json.dumps(["VEST"])
    )

    db.add(z1)
    db.add(z2)

    # 3. Seed Realistic Demo Incidents
    now = datetime.utcnow()
    demo_incidents = [
        {
            "id": f"demo_inc_{uuid.uuid4().hex[:8]}",
            "event_type": "ZONE_AND_PPE_VIOLATION",
            "severity": "CRITICAL",
            "status": "NEW",
            "timestamp": now - timedelta(minutes=14),
            "source_id": "camera_warehouse_north_01",
            "zone_id": z1.id,
            "track_id": 104,
            "confidence": 0.94,
            "ppe_status": "NON_COMPLIANT",
            "explanation": "Worker (Track #104) entered Robotic Cell #3 without hard hat while robotic arm was active.",
            "model_name": "demo_synthetic_yolo_ppe",
            "inference_mode": "DEMO"
        },
        {
            "id": f"demo_inc_{uuid.uuid4().hex[:8]}",
            "event_type": "RESTRICTED_ZONE_VIOLATION",
            "severity": "HIGH",
            "status": "UNDER_REVIEW",
            "timestamp": now - timedelta(hours=1, minutes=20),
            "source_id": "camera_transit_corridor_02",
            "zone_id": z2.id,
            "track_id": 89,
            "confidence": 0.91,
            "ppe_status": "COMPLIANT",
            "explanation": "Pedestrian crossed forklift lane outside designated pedestrian zebra walkway.",
            "model_name": "demo_synthetic_yolo",
            "inference_mode": "DEMO"
        },
        {
            "id": f"demo_inc_{uuid.uuid4().hex[:8]}",
            "event_type": "PPE_NON_COMPLIANCE",
            "severity": "MEDIUM",
            "status": "ACKNOWLEDGED",
            "timestamp": now - timedelta(hours=3),
            "source_id": "camera_loading_dock_04",
            "zone_id": None,
            "track_id": 71,
            "confidence": 0.88,
            "ppe_status": "NON_COMPLIANT",
            "explanation": "Contractor observed in loading dock zone without high-visibility safety vest.",
            "model_name": "demo_synthetic_ppe",
            "inference_mode": "DEMO"
        },
        {
            "id": f"demo_inc_{uuid.uuid4().hex[:8]}",
            "event_type": "UNCERTAIN_SAFETY_OBSERVATION",
            "severity": "LOW",
            "status": "NEW",
            "timestamp": now - timedelta(hours=5),
            "source_id": "camera_warehouse_north_01",
            "zone_id": z1.id,
            "track_id": 55,
            "confidence": 0.42,
            "ppe_status": "UNCERTAIN",
            "explanation": "Person partially occluded by steel storage rack; head region unclear for helmet check.",
            "model_name": "demo_synthetic_ppe",
            "inference_mode": "DEMO"
        },
        {
            "id": f"demo_inc_{uuid.uuid4().hex[:8]}",
            "event_type": "RESTRICTED_ZONE_VIOLATION",
            "severity": "HIGH",
            "status": "RESOLVED",
            "timestamp": now - timedelta(days=1, hours=2),
            "source_id": "camera_transit_corridor_02",
            "zone_id": z2.id,
            "track_id": 34,
            "confidence": 0.95,
            "ppe_status": "COMPLIANT",
            "explanation": "Maintenance technician crossed zone during scheduled maintenance lockout.",
            "model_name": "demo_synthetic_yolo",
            "inference_mode": "DEMO",
            "resolution_notes": "Verified scheduled lockout-tagout procedure was in place. Incident closed."
        },
        {
            "id": f"demo_inc_{uuid.uuid4().hex[:8]}",
            "event_type": "MONITORING_SYSTEM_ERROR",
            "severity": "HIGH",
            "status": "RESOLVED",
            "timestamp": now - timedelta(days=1, hours=8),
            "source_id": "camera_loading_dock_04",
            "zone_id": None,
            "track_id": None,
            "confidence": None,
            "ppe_status": "NOT_EVALUATED",
            "explanation": "Video RTSP feed stuttered; frame drop exceeded 15 frames.",
            "model_name": "system_health_checker",
            "inference_mode": "DEMO",
            "resolution_notes": "Network switch firmware updated. Stream stability restored."
        }
    ]

    for inc_data in demo_incidents:
        inc = Incident(
            id=inc_data["id"],
            event_type=inc_data["event_type"],
            severity=inc_data["severity"],
            status=inc_data["status"],
            timestamp=inc_data["timestamp"],
            source_id=inc_data["source_id"],
            zone_id=inc_data["zone_id"],
            track_id=inc_data["track_id"],
            confidence=inc_data["confidence"],
            ppe_status=inc_data["ppe_status"],
            explanation=inc_data["explanation"],
            model_name=inc_data["model_name"],
            inference_mode="DEMO",
            is_demo=True,
            resolution_notes=inc_data.get("resolution_notes")
        )
        db.add(inc)

        audit = AuditLog(
            id=str(uuid.uuid4()),
            incident_id=inc.id,
            action="DEMO_LOADED",
            actor="SYSTEM_DEMO_SEEDER",
            details="Sample record loaded for user interface inspection and evaluation."
        )
        db.add(audit)

    db.commit()
    return {
        "status": "SUCCESS",
        "zones_created": 2,
        "incidents_created": len(demo_incidents),
        "message": "Demo mode datasets initialized successfully."
    }


def clear_demo_data(db: Session) -> Dict[str, Any]:
    """Cleans up all records marked with is_demo=True."""
    # Delete incidents with is_demo=True
    incidents = db.query(Incident).filter(Incident.is_demo == True).all()
    inc_ids = [i.id for i in incidents]

    # Delete related audit logs
    for inc_id in inc_ids:
        db.query(AuditLog).filter(AuditLog.incident_id == inc_id).delete()

    db.query(Incident).filter(Incident.is_demo == True).delete()

    # Delete sample demo zones
    db.query(RestrictedZone).filter(RestrictedZone.id.in_(["zone_demo_welding_cell", "zone_demo_forklift_lane"])).delete()

    db.commit()
    return {
        "status": "SUCCESS",
        "incidents_cleared": len(inc_ids),
        "message": "All demo records have been cleared."
    }
