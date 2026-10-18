from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Text
from backend.app.database import Base

class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(String, primary_key=True, index=True)
    video_id = Column(String, nullable=False, index=True)
    status = Column(String, default="PENDING")  # PENDING, RUNNING, PAUSED, COMPLETED, STOPPED, FAILED
    progress = Column(Float, default=0.0)  # 0.0 to 100.0
    processed_frames = Column(Integer, default=0)
    total_frames = Column(Integer, default=0)
    current_timestamp = Column(Float, default=0.0)
    fps_measured = Column(Float, default=0.0)
    person_count = Column(Integer, default=0)
    incident_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
