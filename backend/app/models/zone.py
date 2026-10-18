from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text
from backend.app.database import Base

class RestrictedZone(Base):
    __tablename__ = "restricted_zones"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    # Stored as JSON string: [{"x": 0.1, "y": 0.2}, ...]
    polygon_coords = Column(Text, nullable=False)
    color = Column(String, default="#f97316")  # Safety orange default
    severity = Column(String, default="HIGH")  # LOW, MEDIUM, HIGH, CRITICAL
    is_active = Column(Boolean, default=True)
    dwell_time_seconds = Column(Float, default=1.0)
    # Stored as JSON array: ["HELMET", "VEST"]
    required_ppe = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
