import uuid
import json
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.zone import RestrictedZone
from backend.app.schemas.zone import ZoneCreate, ZoneUpdate, ZoneRead

router = APIRouter()

@router.get("/zones", response_model=List[ZoneRead])
def list_zones(db: Session = Depends(get_db)):
    zones = db.query(RestrictedZone).order_by(RestrictedZone.created_at.desc()).all()
    results = []
    for z in zones:
        results.append(ZoneRead(
            id=z.id,
            name=z.name,
            polygon_coords=json.loads(z.polygon_coords),
            color=z.color,
            severity=z.severity,
            is_active=z.is_active,
            dwell_time_seconds=z.dwell_time_seconds,
            required_ppe=json.loads(z.required_ppe) if z.required_ppe else [],
            created_at=z.created_at,
            updated_at=z.updated_at
        ))
    return results

@router.post("/zones", response_model=ZoneRead)
def create_zone(payload: ZoneCreate, db: Session = Depends(get_db)):
    if len(payload.polygon_coords) < 3:
        raise HTTPException(status_code=400, detail="Zone polygon must have at least 3 vertices")

    zone_id = f"zone_{uuid.uuid4().hex[:10]}"
    coords_json = json.dumps([p.model_dump() for p in payload.polygon_coords])
    ppe_json = json.dumps(payload.required_ppe)

    zone = RestrictedZone(
        id=zone_id,
        name=payload.name,
        polygon_coords=coords_json,
        color=payload.color,
        severity=payload.severity,
        is_active=payload.is_active,
        dwell_time_seconds=payload.dwell_time_seconds,
        required_ppe=ppe_json
    )
    db.add(zone)
    db.commit()
    db.refresh(zone)

    return ZoneRead(
        id=zone.id,
        name=zone.name,
        polygon_coords=payload.polygon_coords,
        color=zone.color,
        severity=zone.severity,
        is_active=zone.is_active,
        dwell_time_seconds=zone.dwell_time_seconds,
        required_ppe=payload.required_ppe,
        created_at=zone.created_at,
        updated_at=zone.updated_at
    )

@router.put("/zones/{zone_id}", response_model=ZoneRead)
def update_zone(zone_id: str, payload: ZoneUpdate, db: Session = Depends(get_db)):
    zone = db.query(RestrictedZone).filter(RestrictedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    if payload.name is not None:
        zone.name = payload.name
    if payload.polygon_coords is not None:
        if len(payload.polygon_coords) < 3:
            raise HTTPException(status_code=400, detail="Polygon must have at least 3 vertices")
        zone.polygon_coords = json.dumps([p.model_dump() for p in payload.polygon_coords])
    if payload.color is not None:
        zone.color = payload.color
    if payload.severity is not None:
        zone.severity = payload.severity
    if payload.is_active is not None:
        zone.is_active = payload.is_active
    if payload.dwell_time_seconds is not None:
        zone.dwell_time_seconds = payload.dwell_time_seconds
    if payload.required_ppe is not None:
        zone.required_ppe = json.dumps(payload.required_ppe)

    db.commit()
    db.refresh(zone)

    return ZoneRead(
        id=zone.id,
        name=zone.name,
        polygon_coords=json.loads(zone.polygon_coords),
        color=zone.color,
        severity=zone.severity,
        is_active=zone.is_active,
        dwell_time_seconds=zone.dwell_time_seconds,
        required_ppe=json.loads(zone.required_ppe) if zone.required_ppe else [],
        created_at=zone.created_at,
        updated_at=zone.updated_at
    )

@router.delete("/zones/{zone_id}")
def delete_zone(zone_id: str, db: Session = Depends(get_db)):
    zone = db.query(RestrictedZone).filter(RestrictedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    db.delete(zone)
    db.commit()
    return {"status": "DELETED", "zone_id": zone_id}
