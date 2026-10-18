from typing import List, Optional, Any
from pydantic import BaseModel, Field

class Point2D(BaseModel):
    x: float = Field(..., ge=0.0, le=1.0, description="Normalized X coordinate [0.0 - 1.0]")
    y: float = Field(..., ge=0.0, le=1.0, description="Normalized Y coordinate [0.0 - 1.0]")

class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float
    class_id: int
    class_name: str
    track_id: Optional[int] = None

class DetectionResult(BaseModel):
    frame_number: int
    timestamp_seconds: float
    detections: List[BoundingBox] = []
