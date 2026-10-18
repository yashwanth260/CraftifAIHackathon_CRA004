import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.evidence import EvidenceFile
from backend.app.config import EVIDENCE_DIR
from backend.app.services.evidence_service import sanitize_path

router = APIRouter()

@router.get("/evidence/{evidence_id}/file")
def get_evidence_file(evidence_id: str, db: Session = Depends(get_db)):
    evidence = db.query(EvidenceFile).filter(EvidenceFile.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence record not found")

    file_path = EVIDENCE_DIR / evidence.filename
    try:
        safe_path = sanitize_path(file_path, EVIDENCE_DIR)
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied: invalid file path")

    if not safe_path.exists():
        raise HTTPException(status_code=404, detail="Evidence image file not found on disk")

    return FileResponse(
        path=str(safe_path),
        media_type=evidence.content_type or "image/jpeg",
        filename=evidence.filename
    )
