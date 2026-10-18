import os
import uuid
from pathlib import Path
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.config import UPLOADS_DIR, ALLOWED_VIDEO_EXTENSIONS, MAX_UPLOAD_SIZE_MB
from backend.app.models.video import VideoSource
from backend.app.schemas.video_job import VideoSourceRead
from backend.app.services.video_service import get_video_metadata, create_synthetic_test_video

router = APIRouter()

@router.get("/videos", response_model=List[VideoSourceRead])
def list_videos(db: Session = Depends(get_db)):
    return db.query(VideoSource).order_by(VideoSource.uploaded_at.desc()).all()

@router.post("/videos/upload", response_model=VideoSourceRead)
async def upload_video(file: UploadFile = File(...), db: Session = Depends(get_db)):
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{suffix}'. Supported: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}"
        )

    # Safe unique filename
    video_id = f"vid_{uuid.uuid4().hex[:10]}"
    clean_filename = f"{video_id}_{Path(file.filename).name.replace(' ', '_')}"
    save_path = UPLOADS_DIR / clean_filename

    # Read and enforce max size
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds {MAX_UPLOAD_SIZE_MB}MB size limit.")

    with open(save_path, "wb") as f:
        f.write(contents)

    # Inspect video with OpenCV
    try:
        meta = get_video_metadata(save_path)
    except Exception as e:
        if os.path.exists(save_path):
            os.remove(save_path)
        raise HTTPException(status_code=400, detail=f"Invalid video file: {str(e)}")

    record = VideoSource(
        id=video_id,
        filename=file.filename,
        filepath=str(save_path),
        filesize_bytes=len(contents),
        duration_seconds=meta["duration_seconds"],
        width=meta["width"],
        height=meta["height"],
        fps=meta["fps"],
        total_frames=meta["total_frames"],
        status="READY"
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.post("/videos/generate-sample", response_model=VideoSourceRead)
def generate_sample_video(db: Session = Depends(get_db)):
    """
    Generates a synthetic industrial warehouse camera feed (with walking worker silhouettes
    and hazard zone markings) so user can test computer vision immediately without uploading.
    """
    video_id = f"vid_sample_{uuid.uuid4().hex[:6]}"
    filename = f"industrial_floor_sample_{video_id[:8]}.mp4"
    save_path = UPLOADS_DIR / filename

    created_path = create_synthetic_test_video(save_path, duration_seconds=5, fps=20)
    meta = get_video_metadata(created_path)

    record = VideoSource(
        id=video_id,
        filename=created_path.name,
        filepath=str(created_path),
        filesize_bytes=os.path.getsize(created_path),
        duration_seconds=meta["duration_seconds"],
        width=meta["width"],
        height=meta["height"],
        fps=meta["fps"],
        total_frames=meta["total_frames"],
        status="READY"
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
