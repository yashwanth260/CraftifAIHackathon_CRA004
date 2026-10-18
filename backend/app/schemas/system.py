from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class SystemStatusResponse(BaseModel):
    backend_status: str
    database_status: str
    person_model_status: str
    person_model_name: str
    ppe_model_status: str
    ppe_model_name: Optional[str] = None
    pipegen_status: str
    inference_device: str
    tensorrt_status: str
    active_jobs: int
    evidence_count: int
    storage_used_bytes: int
    demo_mode_active: bool
    is_cuda_available: bool

class ModelConfigureRequest(BaseModel):
    person_model_path: Optional[str] = None
    ppe_model_path: Optional[str] = None
    person_confidence: Optional[float] = None
    ppe_confidence: Optional[float] = None
