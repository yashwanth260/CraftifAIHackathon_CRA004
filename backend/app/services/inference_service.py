import os
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

# Global model references
_person_model = None
_person_model_loaded = False
_person_model_name = "yolov8n.pt"

_ppe_model = None
_ppe_model_loaded = False
_ppe_model_name = None
_ppe_classes: List[str] = []

class SimpleTracker:
    """
    Lightweight IoU + Centroid tracker for assigning consistent track_ids
    to detected people within a single processing session.
    """
    def __init__(self, max_missing_frames: int = 15, iou_threshold: float = 0.3):
        self.next_id = 1
        # track_id -> {"box": [x1, y1, x2, y2], "missing": int}
        self.tracks: Dict[int, Dict[str, Any]] = {}
        self.max_missing = max_missing_frames
        self.iou_threshold = iou_threshold

    @staticmethod
    def compute_iou(boxA: List[float], boxB: List[float]) -> float:
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])

        interArea = max(0.0, xB - xA) * max(0.0, yB - yA)
        boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
        boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])

        unionArea = boxAArea + boxBArea - interArea
        if unionArea <= 0:
            return 0.0
        return interArea / unionArea

    def update(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Takes normalized bounding boxes [{'x1', 'y1', 'x2', 'y2', ...}]
        and returns detections with assigned 'track_id'.
        """
        updated_detections = []
        matched_tracks = set()

        for det in detections:
            det_box = [det["x1"], det["y1"], det["x2"], det["y2"]]
            best_iou = 0.0
            best_track_id = None

            for track_id, track_data in self.tracks.items():
                if track_id in matched_tracks:
                    continue
                iou = self.compute_iou(det_box, track_data["box"])
                if iou > best_iou:
                    best_iou = iou
                    best_track_id = track_id

            if best_iou >= self.iou_threshold and best_track_id is not None:
                self.tracks[best_track_id] = {"box": det_box, "missing": 0}
                matched_tracks.add(best_track_id)
                assigned_id = best_track_id
            else:
                assigned_id = self.next_id
                self.next_id += 1
                self.tracks[assigned_id] = {"box": det_box, "missing": 0}
                matched_tracks.add(assigned_id)

            det_copy = dict(det)
            det_copy["track_id"] = assigned_id
            updated_detections.append(det_copy)

        # Increment missing count for unmatched tracks
        stale_tracks = []
        for track_id, track_data in self.tracks.items():
            if track_id not in matched_tracks:
                track_data["missing"] += 1
                if track_data["missing"] > self.max_missing:
                    stale_tracks.append(track_id)

        for track_id in stale_tracks:
            del self.tracks[track_id]

        return updated_detections


def load_person_detector(model_name: str = "yolov8n.pt"):
    """
    Initializes the Ultralytics YOLO person detector.
    """
    global _person_model, _person_model_loaded, _person_model_name
    try:
        from ultralytics import YOLO
        _person_model = YOLO(model_name)
        _person_model_loaded = True
        _person_model_name = model_name
        return True, f"Loaded {model_name} successfully"
    except Exception as e:
        _person_model_loaded = False
        return False, f"Failed to load person model: {str(e)}"


def load_ppe_detector(model_path: str):
    """
    Loads a dedicated PPE detection model if supplied.
    Validates that model classes contain required PPE labels (helmet/vest).
    """
    global _ppe_model, _ppe_model_loaded, _ppe_model_name, _ppe_classes
    if not model_path or not os.path.exists(model_path):
        _ppe_model_loaded = False
        _ppe_model_name = None
        _ppe_classes = []
        return False, "PPE model path is empty or does not exist on disk."

    try:
        from ultralytics import YOLO
        model = YOLO(model_path)
        # Check class names
        class_names = list(model.names.values()) if hasattr(model, "names") else []
        ppe_relevant = [c.lower() for c in class_names if any(k in c.lower() for k in ["helmet", "hat", "vest", "ppe"])]
        if not ppe_relevant:
            _ppe_model_loaded = False
            return False, f"Model loaded but does not contain PPE classes (found: {class_names}). A generic detector cannot be used as PPE detector."

        _ppe_model = model
        _ppe_model_loaded = True
        _ppe_model_name = model_path
        _ppe_classes = class_names
        return True, f"Loaded PPE model with classes: {class_names}"
    except Exception as e:
        _ppe_model_loaded = False
        return False, f"Error initializing PPE model: {str(e)}"


def get_model_status() -> Dict[str, Any]:
    """Returns the current readiness and details for loaded models."""
    return {
        "person_model": {
            "name": _person_model_name,
            "loaded": _person_model_loaded,
            "type": "Ultralytics YOLO (Class 0: Person)",
            "supported_classes": ["person"] if _person_model_loaded else []
        },
        "ppe_model": {
            "name": _ppe_model_name,
            "loaded": _ppe_model_loaded,
            "type": "Dedicated Industrial PPE Detector" if _ppe_model_loaded else "None Configured",
            "supported_classes": _ppe_classes,
            "status_explanation": (
                "Compatible PPE model active"
                if _ppe_model_loaded
                else "No PPE model weights configured. PPE assessments will return NOT_EVALUATED."
            )
        }
    }


def detect_people(
    frame: np.ndarray,
    confidence_threshold: float = 0.45
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Runs real inference on an actual video frame to detect people.
    Returns: (list_of_detections, error_message_if_any)
    """
    global _person_model, _person_model_loaded
    if not _person_model_loaded:
        success, msg = load_person_detector()
        if not success:
            return [], f"Person detector unavailable: {msg}"

    try:
        h, w = frame.shape[:2]
        # Run YOLO inference
        results = _person_model(frame, verbose=False, conf=confidence_threshold)
        detections = []

        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls_id = int(box.cls[0])
                # COCO class 0 is 'person'
                if cls_id == 0:
                    conf = float(box.conf[0])
                    coords = box.xyxy[0].tolist()  # x1, y1, x2, y2 in pixels
                    # Normalize coordinates
                    x1 = max(0.0, min(1.0, coords[0] / w))
                    y1 = max(0.0, min(1.0, coords[1] / h))
                    x2 = max(0.0, min(1.0, coords[2] / w))
                    y2 = max(0.0, min(1.0, coords[3] / h))

                    detections.append({
                        "x1": x1,
                        "y1": y1,
                        "x2": x2,
                        "y2": y2,
                        "confidence": conf,
                        "class_id": 0,
                        "class_name": "person"
                    })

        return detections, None
    except Exception as e:
        return [], f"Inference execution error: {str(e)}"


def evaluate_ppe_compliance(
    frame: np.ndarray,
    person_box: Dict[str, Any],
    required_ppe: List[str]
) -> Dict[str, Any]:
    """
    Evaluates safety helmet and high-visibility vest compliance for a detected person.
    If no PPE model is configured, returns honest NOT_EVALUATED status.
    If evidence is ambiguous or occluded, returns UNCERTAIN.
    """
    global _ppe_model, _ppe_model_loaded

    if not _ppe_model_loaded:
        return {
            "status": "NOT_EVALUATED",
            "helmet": "NOT_EVALUATED",
            "vest": "NOT_EVALUATED",
            "confidence": None,
            "explanation": "No dedicated PPE model configured on system. Set PPE_MODEL_PATH to enable compliance checks."
        }

    # If PPE model is loaded, crop person region and run inference
    try:
        h, w = frame.shape[:2]
        px1 = int(person_box["x1"] * w)
        py1 = int(person_box["y1"] * h)
        px2 = int(person_box["x2"] * w)
        py2 = int(person_box["y2"] * h)

        if px2 - px1 < 15 or py2 - py1 < 30:
            return {
                "status": "UNCERTAIN",
                "helmet": "UNCERTAIN",
                "vest": "UNCERTAIN",
                "confidence": 0.3,
                "explanation": "Person bounding box resolution too small for confident PPE verification."
            }

        person_crop = frame[py1:py2, px1:px2]
        results = _ppe_model(person_crop, verbose=False, conf=0.4)

        has_helmet = False
        has_vest = False
        max_conf = 0.0

        for r in results:
            for b in r.boxes:
                cls_name = r.names[int(b.cls[0])].lower()
                conf = float(b.conf[0])
                if "helmet" in cls_name or "hat" in cls_name:
                    has_helmet = True
                    max_conf = max(max_conf, conf)
                if "vest" in cls_name:
                    has_vest = True
                    max_conf = max(max_conf, conf)

        # Check against required items
        requires_helmet = "HELMET" in required_ppe
        requires_vest = "VEST" in required_ppe

        helmet_compliant = has_helmet if requires_helmet else True
        vest_compliant = has_vest if requires_vest else True

        if helmet_compliant and vest_compliant:
            overall = "COMPLIANT"
            reason = "Worker observed wearing all required PPE."
        else:
            overall = "NON_COMPLIANT"
            missing = []
            if requires_helmet and not has_helmet:
                missing.append("safety helmet")
            if requires_vest and not has_vest:
                missing.append("high-visibility vest")
            reason = f"Missing required PPE: {', '.join(missing)}."

        return {
            "status": overall,
            "helmet": "PRESENT" if has_helmet else ("MISSING" if requires_helmet else "NOT_REQUIRED"),
            "vest": "PRESENT" if has_vest else ("MISSING" if requires_vest else "NOT_REQUIRED"),
            "confidence": max_conf if max_conf > 0 else 0.85,
            "explanation": reason
        }

    except Exception as e:
        return {
            "status": "UNCERTAIN",
            "helmet": "UNCERTAIN",
            "vest": "UNCERTAIN",
            "confidence": 0.0,
            "explanation": f"PPE evaluation encountered an error: {str(e)}"
        }
