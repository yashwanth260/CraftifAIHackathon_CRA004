import csv
import io
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Response
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.incident import Incident
from backend.app.models.evidence import EvidenceFile
from backend.app.models.audit import AuditLog
from backend.app.schemas.incident import IncidentRead, IncidentUpdate

router = APIRouter()

@router.get("/incidents", response_model=List[IncidentRead])
def list_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    event_type: Optional[str] = None,
    source_id: Optional[str] = None,
    zone_id: Optional[str] = None,
    is_demo: Optional[bool] = None,
    inference_mode: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(Incident)

    if status:
        query = query.filter(Incident.status == status)
    if severity:
        query = query.filter(Incident.severity == severity)
    if event_type:
        query = query.filter(Incident.event_type == event_type)
    if source_id:
        query = query.filter(Incident.source_id == source_id)
    if zone_id:
        query = query.filter(Incident.zone_id == zone_id)
    if is_demo is not None:
        query = query.filter(Incident.is_demo == is_demo)
    if inference_mode:
        query = query.filter(Incident.inference_mode == inference_mode)
    if search:
        s = f"%{search}%"
        query = query.filter((Incident.explanation.ilike(s)) | (Incident.id.ilike(s)) | (Incident.source_id.ilike(s)))

    incidents = query.order_by(Incident.timestamp.desc()).offset(skip).limit(limit).all()

    # Enrich with evidence links
    results = []
    for inc in incidents:
        read_obj = IncidentRead.model_validate(inc)
        if inc.evidence_id:
            ev = db.query(EvidenceFile).filter(EvidenceFile.id == inc.evidence_id).first()
            if ev:
                read_obj.evidence_url = f"/api/evidence/{ev.id}/file"
                read_obj.evidence_hash = ev.sha256_hash
        results.append(read_obj)

    return results

@router.get("/incidents/export.csv")
def export_incidents_csv(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    is_demo: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    if severity:
        query = query.filter(Incident.severity == severity)
    if is_demo is not None:
        query = query.filter(Incident.is_demo == is_demo)

    incidents = query.order_by(Incident.timestamp.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Incident ID", "Timestamp (UTC)", "Event Type", "Severity", "Status",
        "Source ID", "Zone ID", "Track ID", "Confidence", "PPE Status",
        "Model Name", "Inference Mode", "Is Demo", "Explanation", "Resolution Notes"
    ])

    for inc in incidents:
        writer.writerow([
            inc.id,
            inc.timestamp.isoformat() if inc.timestamp else "",
            inc.event_type,
            inc.severity,
            inc.status,
            inc.source_id,
            inc.zone_id or "",
            inc.track_id or "",
            f"{inc.confidence:.2f}" if inc.confidence else "",
            inc.ppe_status,
            inc.model_name,
            inc.inference_mode,
            inc.is_demo,
            inc.explanation,
            inc.resolution_notes or inc.dismiss_reason or ""
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=safety_incidents_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

@router.get("/incidents/{incident_id}")
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    read_obj = IncidentRead.model_validate(inc)
    ev_data = None
    if inc.evidence_id:
        ev = db.query(EvidenceFile).filter(EvidenceFile.id == inc.evidence_id).first()
        if ev:
            read_obj.evidence_url = f"/api/evidence/{ev.id}/file"
            read_obj.evidence_hash = ev.sha256_hash
            ev_data = {
                "id": ev.id,
                "filename": ev.filename,
                "sha256_hash": ev.sha256_hash,
                "frame_number": ev.frame_number,
                "created_at": ev.created_at.isoformat()
            }

    # Fetch audit logs
    logs = db.query(AuditLog).filter(AuditLog.incident_id == incident_id).order_by(AuditLog.timestamp.desc()).all()

    return {
        "incident": read_obj,
        "evidence": ev_data,
        "audit_logs": [
            {
                "id": l.id,
                "action": l.action,
                "actor": l.actor,
                "details": l.details,
                "timestamp": l.timestamp.isoformat()
            }
            for l in logs
        ]
    }

@router.patch("/incidents/{incident_id}", response_model=IncidentRead)
def update_incident(incident_id: str, payload: IncidentUpdate, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    old_status = inc.status
    if payload.status is not None:
        inc.status = payload.status
    if payload.severity is not None:
        inc.severity = payload.severity
    if payload.resolution_notes is not None:
        inc.resolution_notes = payload.resolution_notes
    if payload.dismiss_reason is not None:
        inc.dismiss_reason = payload.dismiss_reason

    # Add audit log
    audit = AuditLog(
        id=str(uuid.uuid4()),
        incident_id=inc.id,
        action=payload.status or "UPDATED",
        actor="OPERATOR",
        details=f"Status transitioned from {old_status} to {inc.status}. Notes: {payload.resolution_notes or payload.dismiss_reason or 'None'}"
    )
    db.add(audit)
    db.commit()
    db.refresh(inc)

    read_obj = IncidentRead.model_validate(inc)
    if inc.evidence_id:
        ev = db.query(EvidenceFile).filter(EvidenceFile.id == inc.evidence_id).first()
        if ev:
            read_obj.evidence_url = f"/api/evidence/{ev.id}/file"
            read_obj.evidence_hash = ev.sha256_hash
    return read_obj
