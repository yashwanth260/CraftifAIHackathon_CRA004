import time
from typing import Dict, Tuple, Optional, Any
from datetime import datetime

class SafetyRuleEngine:
    """
    Industrial safety rule engine.
    - Evaluates incidents against safety criteria.
    - Deduplicates repeated events within configurable time windows.
    - Resolves incident severity with transparent explanations.
    - Combines coincident zone and PPE violations into high-priority compound incidents.
    """
    def __init__(self, deduplication_window_seconds: float = 10.0):
        self.dedup_window = deduplication_window_seconds
        # Key: (source_id, track_id, event_type, zone_id) -> timestamp
        self.recent_events: Dict[Tuple[str, Optional[int], str, Optional[str]], float] = {}

    def is_duplicate(
        self,
        source_id: str,
        track_id: Optional[int],
        event_type: str,
        zone_id: Optional[str],
        current_time: Optional[float] = None
    ) -> bool:
        """
        Returns True if an identical incident was recorded within the deduplication window.
        """
        if current_time is None:
            current_time = time.time()

        key = (source_id, track_id, event_type, zone_id)
        if key in self.recent_events:
            elapsed = current_time - self.recent_events[key]
            if elapsed < self.dedup_window:
                return True

        self.recent_events[key] = current_time
        return False

    def evaluate_severity(
        self,
        event_type: str,
        zone_severity: Optional[str] = None,
        ppe_status: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Determines the severity and rationale for an incident.
        Returns: (severity: LOW | MEDIUM | HIGH | CRITICAL, reason: str)
        """
        if event_type == "ZONE_AND_PPE_VIOLATION":
            return (
                "CRITICAL",
                "Simultaneous restricted-zone intrusion and PPE non-compliance detected. Maximum safety hazard."
            )

        if event_type == "RESTRICTED_ZONE_VIOLATION":
            sev = zone_severity if zone_severity in ["LOW", "MEDIUM", "HIGH", "CRITICAL"] else "HIGH"
            return (
                sev,
                f"Unauthorized entry into configured restricted zone (Zone baseline severity: {sev})."
            )

        if event_type == "PPE_NON_COMPLIANCE":
            return (
                "MEDIUM",
                "Worker observed without required personal protective equipment (helmet or high-visibility vest)."
            )

        if event_type == "UNCERTAIN_SAFETY_OBSERVATION":
            return (
                "LOW",
                "Ambiguous or partially occluded observation. Flagged for operator review without automated enforcement."
            )

        if event_type == "MONITORING_SYSTEM_ERROR":
            return (
                "HIGH",
                "Sensor, model, or hardware pipeline interruption. Safety coverage degraded."
            )

        return ("MEDIUM", "Standard safety alert triggered.")

    def should_combine(self, zone_violation: bool, ppe_non_compliant: bool) -> bool:
        """Checks if both zone intrusion and PPE failure are present for compound escalation."""
        return zone_violation and ppe_non_compliant

    def prune_old_cache(self, max_age_seconds: float = 60.0):
        now = time.time()
        to_del = [k for k, t in self.recent_events.items() if (now - t) > max_age_seconds]
        for k in to_del:
            del self.recent_events[k]
