from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

class PipeGenEventIn(BaseModel):
    event_id: Optional[str] = None
    timestamp: datetime
    source_id: str
    track_id: Optional[int] = None
    event_type: str = Field(..., pattern="^(RESTRICTED_ZONE_VIOLATION|PPE_NON_COMPLIANCE|ZONE_AND_PPE_VIOLATION|UNCERTAIN_SAFETY_OBSERVATION|MONITORING_SYSTEM_ERROR)$")
    zone_id: Optional[str] = None
    severity: str = Field("HIGH", pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    ppe_status: str = Field("NOT_EVALUATED", pattern="^(COMPLIANT|NON_COMPLIANT|UNCERTAIN|NOT_EVALUATED)$")
    evidence_reference: Optional[str] = None
    model_name: str = "configured-model"
    inference_mode: str = Field("PIPEGEN", pattern="^(REAL|DEMO|PIPEGEN)$")
    explanation: str

class PipeGenEventBatch(BaseModel):
    events: List[PipeGenEventIn]

class PipeGenStatusResponse(BaseModel):
    connected: bool
    pipeline_id: str
    last_event_time: Optional[datetime] = None
    total_events_received: int = 0
    malformed_events_count: int = 0
    adapter_status: str
