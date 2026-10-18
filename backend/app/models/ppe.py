from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Text
from backend.app.database import Base

class PPEAssessment(Base):
    __tablename__ = "ppe_assessments"

    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, nullable=True, index=True)
    track_id = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    helmet_status = Column(String, default="NOT_EVALUATED")  # PRESENT, MISSING, UNCERTAIN, NOT_EVALUATED
    helmet_confidence = Column(Float, nullable=True)
    vest_status = Column(String, default="NOT_EVALUATED")  # PRESENT, MISSING, UNCERTAIN, NOT_EVALUATED
    vest_confidence = Column(Float, nullable=True)
    overall_status = Column(String, default="NOT_EVALUATED")  # COMPLIANT, NON_COMPLIANT, UNCERTAIN, NOT_EVALUATED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
