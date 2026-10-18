from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class VideoSourceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    filepath: str
    filesize_bytes: int
    duration_seconds: float
    width: int
    height: int
    fps: float
    total_frames: int
    status: str
    uploaded_at: datetime

class JobCreate(BaseModel):
    video_id: str
    selected_zone_ids: Optional[List[str]] = None
    enable_ppe: bool = False
    dwell_time_seconds: Optional[float] = None
    confidence_threshold: Optional[float] = None

class JobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    video_id: str
    status: str
    progress: float
    processed_frames: int
    total_frames: int
    current_timestamp: float
    fps_measured: float
    person_count: int
    incident_count: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
