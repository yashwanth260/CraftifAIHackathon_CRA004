import json
from typing import List, Dict, Tuple, Any, Optional

def point_in_polygon(x: float, y: float, polygon: List[Dict[str, float]]) -> bool:
    """
    Ray-casting algorithm to determine if a normalized point (x, y)
    is strictly inside the polygon defined by vertices [{'x': float, 'y': float}, ...].
    """
    if len(polygon) < 3:
        return False

    inside = False
    n = len(polygon)
    p1x = polygon[0]['x']
    p1y = polygon[0]['y']

    for i in range(n + 1):
        p2x = polygon[i % n]['x']
        p2y = polygon[i % n]['y']
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y

    return inside


def get_bottom_center_reference_point(x1: float, y1: float, x2: float, y2: float) -> Tuple[float, float]:
    """
    Returns the bottom-center normalized reference point of a bounding box.
    This represents the feet contact point on the ground for accurate zone entry detection.
    """
    center_x = (x1 + x2) / 2.0
    bottom_y = y2
    return center_x, bottom_y


class DwellTimeTracker:
    """
    Tracks how long a track_id has been inside each zone.
    Maintains a mapping: (track_id, zone_id) -> start_timestamp
    """
    def __init__(self):
        # (track_id, zone_id) -> {"first_seen": float, "last_seen": float, "triggered": bool}
        self.state: Dict[Tuple[int, str], Dict[str, Any]] = {}

    def update(self, track_id: int, zone_id: str, current_time: float, dwell_threshold_seconds: float) -> bool:
        """
        Updates dwell tracking for (track_id, zone_id).
        Returns True if dwell time threshold has just been reached/exceeded and not yet triggered.
        """
        key = (track_id, zone_id)
        if key not in self.state:
            self.state[key] = {
                "first_seen": current_time,
                "last_seen": current_time,
                "triggered": False
            }
            # If dwell threshold is 0, trigger immediately
            if dwell_threshold_seconds <= 0.0:
                self.state[key]["triggered"] = True
                return True
            return False

        record = self.state[key]
        record["last_seen"] = current_time
        dwell_duration = current_time - record["first_seen"]

        if dwell_duration >= dwell_threshold_seconds and not record["triggered"]:
            record["triggered"] = True
            return True

        return False

    def prune_stale(self, active_keys: List[Tuple[int, str]], timeout_seconds: float = 5.0, current_time: float = 0.0):
        """Removes tracking entries that were not seen recently"""
        keys_to_remove = []
        for key, record in self.state.items():
            if key not in active_keys and (current_time - record["last_seen"]) > timeout_seconds:
                keys_to_remove.append(key)
        for key in keys_to_remove:
            del self.state[key]
