import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from backend.app.models.incident import Incident
from backend.app.models.audit import AuditLog
from backend.app.schemas.pipeline import PipeGenEventIn
from backend.app.services.rule_engine import SafetyRuleEngine

class PipeGenAdapter:
    """
    Modular integration adapter for CraftifAI PipeGen edge computer-vision pipelines.
    - Consumes structured JSON events matching PipeGen specification.
    - Validates schema and integrity.
    - Normalizes into internal incident store.
    - Applies deduplication and safety auditing.
    - Tracks adapter health and error metrics.
    """
    def __init__(self):
        self.connected = False
        self.pipeline_id = "ai-safety-sentinel-360-pipegen"
        self.total_events_received = 0
        self.malformed_events_count = 0
        self.last_event_time: Optional[datetime] = None
        self.rule_engine = SafetyRuleEngine(deduplication_window_seconds=10.0)

    def get_status(self) -> Dict[str, Any]:
        return {
            "connected": self.connected,
            "pipeline_id": self.pipeline_id,
            "last_event_time": self.last_event_time,
            "total_events_received": self.total_events_received,
            "malformed_events_count": self.malformed_events_count,
            "adapter_status": "READY" if self.connected else "PIPELINE NOT CONNECTED"
        }

    def connect(self) -> Dict[str, Any]:
        self.connected = True
        self.last_event_time = datetime.utcnow()
        return {
            "status": "CONNECTED",
            "message": "CraftifAI PipeGen edge pipeline connected successfully."
        }

    def disconnect(self) -> Dict[str, Any]:
        self.connected = False
        return {
            "status": "DISCONNECTED",
            "message": "CraftifAI PipeGen edge pipeline disconnected."
        }

    def ingest_event(self, db: Session, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates, normalizes, and persists an incoming PipeGen event.
        Returns result dict with status: 'INGESTED' | 'DUPLICATE' | 'MALFORMED'.
        """
        self.total_events_received += 1

        # 1. Schema validation
        try:
            event = PipeGenEventIn(**event_data)
        except Exception as e:
            self.malformed_events_count += 1
            return {
                "status": "MALFORMED",
                "message": f"Schema validation failed: {str(e)}"
            }

        self.connected = True
        self.last_event_time = datetime.utcnow()

        # 2. Deduplication check
        if self.rule_engine.is_duplicate(
            source_id=event.source_id,
            track_id=event.track_id,
            event_type=event.event_type,
            zone_id=event.zone_id
        ):
            return {
                "status": "DUPLICATE",
                "message": "Event discarded as continuous observation within deduplication window."
            }

        # 3. Create persistent Incident
        incident_id = event.event_id or f"pipegen_{uuid.uuid4().hex[:10]}"
        incident = Incident(
            id=incident_id,
            event_type=event.event_type,
            severity=event.severity,
            status="NEW",
            source_id=event.source_id,
            zone_id=event.zone_id,
            track_id=event.track_id,
            confidence=event.confidence,
            ppe_status=event.ppe_status,
            explanation=event.explanation,
            evidence_id=event.evidence_reference,
            model_name=event.model_name,
            inference_mode="PIPEGEN",
            is_demo=False
        )
        db.add(incident)

        # 4. Audit Log
        audit = AuditLog(
            id=str(uuid.uuid4()),
            incident_id=incident_id,
            action="INGESTED_PIPEGEN",
            actor="PIPEGEN_ADAPTER",
            details=f"Structured event ingested from CraftifAI PipeGen pipeline ({event.model_name})."
        )
        db.add(audit)
        db.commit()

        return {
            "status": "INGESTED",
            "incident_id": incident_id,
            "timestamp": incident.timestamp.isoformat()
        }

# Singleton instance
pipegen_adapter = PipeGenAdapter()
