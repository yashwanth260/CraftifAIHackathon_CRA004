from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class IncidentBase(BaseModel):
    event_type: str = Field(..., pattern="^(RESTRICTED_ZONE_VIOLATION|PPE_NON_COMPLIANCE|ZONE_AND_PPE_VIOLATION|UNCERTAIN_SAFETY_OBSERVATION|MONITORING_SYSTEM_ERROR)$")
    severity: str = Field("HIGH", pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    status: str = Field("NEW", pattern="^(NEW|ACKNOWLEDGED|UNDER_REVIEW|RESOLVED|DISMISSED)$")
    source_id: str
    zone_id: Optional[str] = None
    track_id: Optional[int] = None
    confidence: Optional[float] = None
    ppe_status: str = Field("NOT_EVALUATED", pattern="^(COMPLIANT|NON_COMPLIANT|UNCERTAIN|NOT_EVALUATED)$")
    explanation: str
    evidence_id: Optional[str] = None
    model_name: str = "yolov8n"
    inference_mode: str = Field("REAL", pattern="^(REAL|DEMO|PIPEGEN)$")
    is_demo: bool = False

class IncidentCreate(IncidentBase):
    id: Optional[str] = None
    timestamp: Optional[datetime] = None

class IncidentUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(NEW|ACKNOWLEDGED|UNDER_REVIEW|RESOLVED|DISMISSED)$")
    severity: Optional[str] = Field(None, pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    resolution_notes: Optional[str] = None
    dismiss_reason: Optional[str] = None

class IncidentRead(IncidentBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    timestamp: datetime
    resolution_notes: Optional[str] = None
    dismiss_reason: Optional[str] = None
    evidence_url: Optional[str] = None
    evidence_hash: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class IncidentFilter(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    event_type: Optional[str] = None
    zone_id: Optional[str] = None
    source_id: Optional[str] = None
    is_demo: Optional[bool] = None
    ppe_status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = None
    skip: int = 0
    limit: int = 50
