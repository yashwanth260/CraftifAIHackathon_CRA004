from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text
from backend.app.database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, index=True)
    event_type = Column(String, nullable=False, index=True)
    # RESTRICTED_ZONE_VIOLATION, PPE_NON_COMPLIANCE, ZONE_AND_PPE_VIOLATION, UNCERTAIN_SAFETY_OBSERVATION, MONITORING_SYSTEM_ERROR
    severity = Column(String, default="HIGH", index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String, default="NEW", index=True)  # NEW, ACKNOWLEDGED, UNDER_REVIEW, RESOLVED, DISMISSED
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    source_id = Column(String, nullable=False)
    zone_id = Column(String, nullable=True, index=True)
    track_id = Column(Integer, nullable=True)
    confidence = Column(Float, nullable=True)
    ppe_status = Column(String, default="NOT_EVALUATED")  # COMPLIANT, NON_COMPLIANT, UNCERTAIN, NOT_EVALUATED
    explanation = Column(Text, nullable=False)
    evidence_id = Column(String, nullable=True)
    model_name = Column(String, default="yolov8n")
    inference_mode = Column(String, default="REAL")  # REAL, DEMO, PIPEGEN
    is_demo = Column(Boolean, default=False, index=True)
    resolution_notes = Column(Text, nullable=True)
    dismiss_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
