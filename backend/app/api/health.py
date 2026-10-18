import os
import torch
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.services.inference_service import get_model_status, load_person_detector, load_ppe_detector
from backend.app.services.pipeline_adapter import pipegen_adapter
from backend.app.schemas.system import SystemStatusResponse, ModelConfigureRequest
from backend.app.models.job import ProcessingJob
from backend.app.models.evidence import EvidenceFile
from backend.app.models.incident import Incident
from backend.app.config import STORAGE_DIR

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AI Safety Sentinel 360",
        "version": "1.0.0"
    }

@router.get("/system/status", response_model=SystemStatusResponse)
def get_system_status(db: Session = Depends(get_db)):
    cuda_avail = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_avail else "CPU (Host Processor)"
    active_jobs = db.query(ProcessingJob).filter(ProcessingJob.status == "RUNNING").count()
    evidence_count = db.query(EvidenceFile).count()
    demo_count = db.query(Incident).filter(Incident.is_demo == True).count()
    
    # Calculate storage size
    storage_size = 0
    try:
        for root, dirs, files in os.walk(STORAGE_DIR):
            for f in files:
                storage_size += os.path.getsize(os.path.join(root, f))
    except Exception:
        pass

    m_status = get_model_status()
    p_stat = "READY" if m_status["person_model"]["loaded"] else "UNLOADED"
    ppe_stat = "READY" if m_status["ppe_model"]["loaded"] else "NOT_CONFIGURED"

    return SystemStatusResponse(
        backend_status="ONLINE",
        database_status="CONNECTED",
        person_model_status=p_stat,
        person_model_name=m_status["person_model"]["name"],
        ppe_model_status=ppe_stat,
        ppe_model_name=m_status["ppe_model"]["name"],
        pipegen_status="CONNECTED" if pipegen_adapter.connected else "PIPELINE NOT CONNECTED",
        inference_device=device_name,
        tensorrt_status="UNAVAILABLE (Requires NVIDIA Jetson / CUDA environment)" if not cuda_avail else "READY",
        active_jobs=active_jobs,
        evidence_count=evidence_count,
        storage_used_bytes=storage_size,
        demo_mode_active=(demo_count > 0),
        is_cuda_available=cuda_avail
    )

@router.get("/models/status")
def get_models_info():
    return get_model_status()

@router.post("/models/configure")
def configure_models(req: ModelConfigureRequest):
    results = {}
    if req.person_model_path:
        ok, msg = load_person_detector(req.person_model_path)
        results["person_model"] = {"success": ok, "message": msg}
    if req.ppe_model_path is not None:
        ok, msg = load_ppe_detector(req.ppe_model_path)
        results["ppe_model"] = {"success": ok, "message": msg}
    return {"status": "UPDATED", "details": results}
