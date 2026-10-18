from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime
from backend.app.database import Base

class VideoSource(Base):
    __tablename__ = "video_sources"

    id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    filesize_bytes = Column(Integer, default=0)
    duration_seconds = Column(Float, default=0.0)
    width = Column(Integer, default=0)
    height = Column(Integer, default=0)
    fps = Column(Float, default=0.0)
    total_frames = Column(Integer, default=0)
    status = Column(String, default="READY")  # READY, PROCESSING, ERROR
    uploaded_at = Column(DateTime, default=datetime.utcnow)
