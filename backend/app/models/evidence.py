from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text
from backend.app.database import Base

class EvidenceFile(Base):
    __tablename__ = "evidence_files"

    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, nullable=True, index=True)
    filename = Column(String, nullable=False)
    relative_path = Column(String, nullable=False)
    sha256_hash = Column(String, nullable=False)
    content_type = Column(String, default="image/jpeg")
    frame_number = Column(Integer, default=0)
    # Stored as JSON string of bounding boxes & labels
    bounding_boxes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
