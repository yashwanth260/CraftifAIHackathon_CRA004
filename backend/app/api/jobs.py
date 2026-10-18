import uuid
import threading
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.job import ProcessingJob
from backend.app.models.video import VideoSource
from backend.app.schemas.video_job import JobCreate, JobRead
from backend.app.services.video_service import run_video_job, request_job_stop

router = APIRouter()

@router.get("/jobs", response_model=List[JobRead])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(ProcessingJob).order_by(ProcessingJob.created_at.desc()).all()

@router.post("/jobs", response_model=JobRead)
def create_job(payload: JobCreate, db: Session = Depends(get_db)):
    video = db.query(VideoSource).filter(VideoSource.id == payload.video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video source not found")

    job_id = f"job_{uuid.uuid4().hex[:10]}"
    job = ProcessingJob(
        id=job_id,
        video_id=video.id,
        status="PENDING",
        progress=0.0,
        processed_frames=0,
        total_frames=video.total_frames,
        current_timestamp=0.0,
        fps_measured=0.0,
        person_count=0,
        incident_count=0
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Spawn asynchronous background processing thread
    thread = threading.Thread(target=run_video_job, args=(job_id,), daemon=True)
    thread.start()

    return job

@router.get("/jobs/{job_id}", response_model=JobRead)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Processing job not found")
    return job

@router.post("/jobs/{job_id}/stop")
def stop_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Processing job not found")
    if job.status not in ["RUNNING", "PENDING"]:
        return {"status": job.status, "message": "Job is not actively running"}

    request_job_stop(job_id)
    return {"status": "STOP_REQUESTED", "message": "Stop signal sent to background processing worker"}
