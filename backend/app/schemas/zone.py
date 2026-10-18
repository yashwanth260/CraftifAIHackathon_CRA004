from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from backend.app.schemas.common import Point2D

class ZoneBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    polygon_coords: List[Point2D] = Field(..., min_length=3, description="Polygon requires at least 3 vertices")
    color: str = Field("#f97316", pattern=r"^#[0-9a-fA-F]{6}$")
    severity: str = Field("HIGH", pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    is_active: bool = True
    dwell_time_seconds: float = Field(1.0, ge=0.0, le=60.0)
    required_ppe: List[str] = Field(default_factory=list)

class ZoneCreate(ZoneBase):
    pass

class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    polygon_coords: Optional[List[Point2D]] = None
    color: Optional[str] = None
    severity: Optional[str] = None
    is_active: Optional[bool] = None
    dwell_time_seconds: Optional[float] = None
    required_ppe: Optional[List[str]] = None

class ZoneRead(ZoneBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
