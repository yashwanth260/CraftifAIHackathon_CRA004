from datetime import datetime, timedelta
from typing import List, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models.incident import Incident
from backend.app.models.job import ProcessingJob
from backend.app.schemas.analytics import (
    AnalyticsSummary,
    TrendPoint,
    SeverityCount,
    CategoryCount,
    PPEOutcomeCount,
    StatusCount
)
from backend.app.services.inference_service import get_model_status

router = APIRouter()

@router.get("/analytics/summary", response_model=AnalyticsSummary)
def get_analytics_summary(db: Session = Depends(get_db)):
    total = db.query(Incident).count()
    open_inc = db.query(Incident).filter(Incident.status.in_(["NEW", "ACKNOWLEDGED", "UNDER_REVIEW"])).count()
    high_crit = db.query(Incident).filter(Incident.severity.in_(["HIGH", "CRITICAL"])).count()
    zone_viols = db.query(Incident).filter(Incident.event_type.in_(["RESTRICTED_ZONE_VIOLATION", "ZONE_AND_PPE_VIOLATION"])).count()
    ppe_viols = db.query(Incident).filter(Incident.event_type.in_(["PPE_NON_COMPLIANCE", "ZONE_AND_PPE_VIOLATION"])).count()
    uncertain = db.query(Incident).filter(Incident.event_type == "UNCERTAIN_SAFETY_OBSERVATION").count()
    awaiting = db.query(Incident).filter(Incident.status == "NEW").count()
    active_jobs = db.query(ProcessingJob).filter(ProcessingJob.status == "RUNNING").count()

    # Severity distribution
    sev_rows = db.query(Incident.severity, func.count(Incident.id)).group_by(Incident.severity).all()
    sev_dist = [SeverityCount(severity=r[0], count=r[1]) for r in sev_rows]

    # Category distribution
    cat_rows = db.query(Incident.event_type, func.count(Incident.id)).group_by(Incident.event_type).all()
    cat_dist = [CategoryCount(category=r[0].replace("_", " "), count=r[1]) for r in cat_rows]

    # PPE outcomes
    ppe_rows = db.query(Incident.ppe_status, func.count(Incident.id)).group_by(Incident.ppe_status).all()
    ppe_dist = [PPEOutcomeCount(outcome=r[0], count=r[1]) for r in ppe_rows]

    # Status distribution
    stat_rows = db.query(Incident.status, func.count(Incident.id)).group_by(Incident.status).all()
    stat_dist = [StatusCount(status=r[0], count=r[1]) for r in stat_rows]

    # 7-day trend
    now = datetime.utcnow()
    trend_points: List[TrendPoint] = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        day_label = day_start.strftime("%b %d")

        v_count = db.query(Incident).filter(
            Incident.timestamp >= day_start,
            Incident.timestamp < day_end,
            Incident.event_type.in_(["RESTRICTED_ZONE_VIOLATION", "ZONE_AND_PPE_VIOLATION"])
        ).count()

        p_count = db.query(Incident).filter(
            Incident.timestamp >= day_start,
            Incident.timestamp < day_end,
            Incident.event_type == "PPE_NON_COMPLIANCE"
        ).count()

        u_count = db.query(Incident).filter(
            Incident.timestamp >= day_start,
            Incident.timestamp < day_end,
            Incident.event_type == "UNCERTAIN_SAFETY_OBSERVATION"
        ).count()

        trend_points.append(TrendPoint(
            date=day_label,
            violations=v_count,
            ppe_incidents=p_count,
            uncertain=u_count
        ))

    m_info = get_model_status()
    m_stat = "ACTIVE" if m_info["person_model"]["loaded"] else "UNLOADED"

    return AnalyticsSummary(
        total_incidents=total,
        open_incidents=open_inc,
        high_critical_incidents=high_crit,
        zone_violations=zone_viols,
        ppe_violations=ppe_viols,
        uncertain_observations=uncertain,
        awaiting_review=awaiting,
        active_jobs=active_jobs,
        system_status="OPTIMAL",
        model_status=m_stat,
        trends=trend_points,
        severity_distribution=sev_dist,
        category_distribution=cat_dist,
        ppe_outcomes=ppe_dist,
        status_distribution=stat_dist
    )
