from sqlalchemy import Column, String, Float, Boolean, Text
from backend.app.database import Base

class SafetyRule(Base):
    __tablename__ = "safety_rules"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    rule_type = Column(String, nullable=False)  # ZONE, PPE, COMBINED, SYSTEM
    severity = Column(String, default="HIGH")  # LOW, MEDIUM, HIGH, CRITICAL
    dwell_time_seconds = Column(Float, default=1.0)
    deduplication_seconds = Column(Float, default=10.0)
    is_enabled = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
