from typing import List, Dict
from pydantic import BaseModel

class TrendPoint(BaseModel):
    date: str
    violations: int
    ppe_incidents: int
    uncertain: int

class SeverityCount(BaseModel):
    severity: str
    count: int

class CategoryCount(BaseModel):
    category: str
    count: int

class PPEOutcomeCount(BaseModel):
    outcome: str
    count: int

class StatusCount(BaseModel):
    status: str
    count: int

class AnalyticsSummary(BaseModel):
    total_incidents: int
    open_incidents: int
    high_critical_incidents: int
    zone_violations: int
    ppe_violations: int
    uncertain_observations: int
    awaiting_review: int
    active_jobs: int
    system_status: str
    model_status: str
    trends: List[TrendPoint] = []
    severity_distribution: List[SeverityCount] = []
    category_distribution: List[CategoryCount] = []
    ppe_outcomes: List[PPEOutcomeCount] = []
    status_distribution: List[StatusCount] = []
