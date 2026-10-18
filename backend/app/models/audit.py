from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from backend.app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, nullable=True, index=True)
    action = Column(String, nullable=False)  # CREATED, ACKNOWLEDGED, UNDER_REVIEW, RESOLVED, DISMISSED, DEMO_LOADED, DEMO_CLEARED
    actor = Column(String, default="OPERATOR")
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
