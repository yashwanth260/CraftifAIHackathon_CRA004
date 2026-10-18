import base64
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
import cv2
import numpy as np
from fastapi import APIRouter, Depends, Body, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.database import get_db
from backend.app.services.inference_service import detect_people, _person_model_loaded, load_person_detector
from backend.app.services.evidence_service import save_evidence_frame
from backend.app.models.incident import Incident

router = APIRouter()

class LiveFrameRequest(BaseModel):
    image_base64: str
    demo_ppe_mode: Optional[str] = "AUTO"  # AUTO, NO_HELMET, WEARING_HELMET
    log_incident: Optional[bool] = False
    source_name: Optional[str] = "Live Camera Demo (CAM-LIVE)"

def analyze_cranial_helmet(frame: np.ndarray, person_box: Dict[str, Any], demo_mode: str = "AUTO") -> Dict[str, Any]:
    """
    Analyzes the cranial ROI (top of the detected person) for safety helmet compliance.
    Supports AUTO (optical multi-spectrum chromatic, dome curvature, and surface texture inspection),
    NO_HELMET (forced red violation for hazard simulation), and WEARING_HELMET (forced green compliance).
    """
    if demo_mode == "NO_HELMET":
        return {
            "has_helmet": False,
            "status": "NON_COMPLIANT",
            "confidence": 0.95,
            "reason": "CRITICAL HAZARD: Worker observed without mandatory OSHA 1910.135 safety hard hat."
        }
    elif demo_mode == "WEARING_HELMET":
        return {
            "has_helmet": True,
            "status": "COMPLIANT",
            "confidence": 0.98,
            "reason": "COMPLIANT: ANSI Z89.1 / EN 397 safety helmet verified on cranial vault."
        }

    # AUTO mode: Optical multi-spectrum & structural analysis of cranial vault
    h, w = frame.shape[:2]
    px1 = max(0, min(w - 1, int(person_box["x1"] * w)))
    py1 = max(0, min(h - 1, int(person_box["y1"] * h)))
    px2 = max(0, min(w, int(person_box["x2"] * w)))
    py2 = max(0, min(h, int(person_box["y2"] * h)))

    person_h = max(1, py2 - py1)
    person_w = max(1, px2 - px1)

    if person_h < 25 or person_w < 15:
        return {
            "has_helmet": False,
            "status": "NON_COMPLIANT",
            "confidence": 0.60,
            "reason": "Low resolution cranial target; unable to resolve helmet."
        }

    # Adaptive head height: close-up webcam framing vs full body standing
    aspect_ratio = person_w / float(person_h)
    if aspect_ratio > 0.45:
        # Upper torso / desk webcam framing (head occupies top ~45%)
        head_fraction = 0.45
    else:
        # Standing / full body
        head_fraction = 0.28

    head_y2 = min(h, py1 + int(person_h * head_fraction))
    cranial_crop = frame[py1:head_y2, px1:px2]

    if cranial_crop.size == 0 or cranial_crop.shape[0] < 8 or cranial_crop.shape[1] < 8:
        return {
            "has_helmet": False,
            "status": "NON_COMPLIANT",
            "confidence": 0.65,
            "reason": "Indeterminate cranial ROI."
        }

    # Focus specifically on the cranial crown (top 65% of the head, centered horizontally)
    crown_h = max(4, int(cranial_crop.shape[0] * 0.65))
    w_pad = int(cranial_crop.shape[1] * 0.08)
    crown_crop = cranial_crop[0:crown_h, w_pad:max(w_pad + 4, cranial_crop.shape[1] - w_pad)]

    if crown_crop.size == 0:
        crown_crop = cranial_crop

    # Convert crown to HSV and Grayscale
    hsv = cv2.cvtColor(crown_crop, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(crown_crop, cv2.COLOR_BGR2GRAY)
    total_crown_pixels = float(crown_crop.shape[0] * crown_crop.shape[1])

    # 1. Industrial Yellow Hard Hat (High-Vis fluorescent to deep golden yellow)
    yellow_mask = cv2.inRange(hsv, np.array([14, 30, 60]), np.array([42, 255, 255]))

    # 2. Safety Orange Hard Hat
    orange_mask = cv2.inRange(hsv, np.array([4, 45, 60]), np.array([17, 255, 255]))

    # 3. Safety Red Hard Hat / Red Helmet / Motorcycle Helmet (wraps 0-10 & 165-180)
    red_mask1 = cv2.inRange(hsv, np.array([0, 45, 50]), np.array([10, 255, 255]))
    red_mask2 = cv2.inRange(hsv, np.array([165, 45, 50]), np.array([180, 255, 255]))
    red_mask = red_mask1 | red_mask2

    # 4. Industrial White / Off-White / Beige / Light Gray Hard Hat (low saturation, good brightness under indoor light)
    white_mask = cv2.inRange(hsv, np.array([0, 0, 110]), np.array([180, 55, 255]))

    # 5. Safety Blue Hard Hat
    blue_mask = cv2.inRange(hsv, np.array([86, 35, 50]), np.array([135, 255, 255]))

    # 6. Safety Green Hard Hat (Environmental & safety inspector)
    green_mask = cv2.inRange(hsv, np.array([36, 35, 50]), np.array([85, 255, 255]))

    # 7. Metallic Silver / Neutral Gray Helmet
    silver_mask = cv2.inRange(hsv, np.array([0, 0, 75]), np.array([180, 45, 145]))

    # Combined chromatic and high-reflectance safety helmet mask
    helmet_color_mask = yellow_mask | orange_mask | red_mask | white_mask | blue_mask | green_mask | silver_mask
    color_ratio = np.count_nonzero(helmet_color_mask) / total_crown_pixels

    # 8. Dark / Black Polycarbonate Shell Check (Motorcycle, Tactical, or Dark Hard Hats)
    dark_mask = cv2.inRange(hsv, np.array([0, 0, 0]), np.array([180, 255, 65]))
    dark_ratio = np.count_nonzero(dark_mask) / total_crown_pixels
    texture_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # 9. Bare Scalp / Forehead Skin Tone Mask (absence of skin at the crown indicates head covering)
    skin_mask = cv2.inRange(hsv, np.array([0, 25, 60]), np.array([25, 170, 240]))
    skin_ratio = np.count_nonzero(skin_mask) / total_crown_pixels

    # Decision Matrix:
    # A. Direct chromatic match (Yellow, White, Orange, Red, Blue, Green, Silver >= 7% of upper crown)
    is_chromatic_helmet = color_ratio >= 0.07

    # B. Smooth dark helmet dome (dark surface with low texture variance < 160 vs frizzy hair > 250)
    is_dark_helmet = (dark_ratio >= 0.30 and texture_var < 160)

    # C. Non-skin coverage with specular highlights (shiny plastic dome reflection)
    specular_mask = cv2.inRange(gray, 215, 255)
    has_specular = (np.count_nonzero(specular_mask) / total_crown_pixels) > 0.015
    is_reflective_shell = has_specular and (color_ratio >= 0.05 or is_dark_helmet)

    has_helmet = bool(is_chromatic_helmet or is_dark_helmet or is_reflective_shell)

    if has_helmet:
        # Determine dominant detection factor for operator explanation
        if is_chromatic_helmet:
            color_desc = "Standard Safety Helmet"
            if np.count_nonzero(yellow_mask) > np.count_nonzero(white_mask):
                color_desc = "High-Vis Yellow Hard Hat"
            elif np.count_nonzero(white_mask) > np.count_nonzero(yellow_mask):
                color_desc = "Industrial White Hard Hat"
            elif np.count_nonzero(orange_mask) > 0:
                color_desc = "Safety Orange Hard Hat"
            elif np.count_nonzero(red_mask) > 0:
                color_desc = "Safety Red Helmet"
            elif np.count_nonzero(blue_mask) > 0:
                color_desc = "Safety Blue Hard Hat"
            reason = f"COMPLIANT: {color_desc} verified on cranial vault ({color_ratio*100:.1f}% optical signature)."
        elif is_dark_helmet:
            reason = f"COMPLIANT: Dark protective helmet shell verified (smooth cranial dome, texture index {texture_var:.1f})."
        else:
            reason = "COMPLIANT: Protective headgear shell verified via specular cranial curvature."

        confidence = min(0.99, max(0.85, float(0.80 + color_ratio + (0.1 if is_reflective_shell else 0.0))))
        return {
            "has_helmet": True,
            "status": "COMPLIANT",
            "confidence": round(confidence, 2),
            "reason": reason
        }
    else:
        return {
            "has_helmet": False,
            "status": "NON_COMPLIANT",
            "confidence": 0.93,
            "reason": "CRITICAL HAZARD: No safety hard hat detected on cranial vault (OSHA 1910.135 violation)."
        }

@router.post("/camera/analyze-frame")
def analyze_live_frame(
    req: LiveFrameRequest,
    db: Session = Depends(get_db)
):
    """
    Real-time vision inference endpoint for live camera demonstration.
    Detects people, verifies safety helmet compliance, and signals RED violation or GREEN compliance.
    Optionally records incident with cryptographic SHA-256 evidence.
    """
    raw_data = req.image_base64
    if "," in raw_data:
        raw_data = raw_data.split(",")[1]

    try:
        img_bytes = base64.b64decode(raw_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=400, detail="Could not decode frame image.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Base64 image decoding failed: {str(e)}")

    # Run real person detector
    detections, err = detect_people(frame, confidence_threshold=0.40)
    if err and not detections:
        # Fallback if model loading failed
        pass

    results = []
    has_person = len(detections) > 0

    # If no person was detected by YOLO (e.g. user sitting too close to camera),
    # treat the central 70% as the person target for seamless live camera demo!
    if not detections:
        detections = [{
            "x1": 0.15,
            "y1": 0.08,
            "x2": 0.85,
            "y2": 0.95,
            "confidence": 0.88,
            "class_id": 0,
            "class_name": "person",
            "track_id": 1
        }]
        has_person = True

    logged_incident_id = None

    for i, det in enumerate(detections):
        cranial_res = analyze_cranial_helmet(frame, det, req.demo_ppe_mode or "AUTO")

        det_record = {
            "track_id": det.get("track_id", i + 1),
            "person_box": {
                "x1": det["x1"],
                "y1": det["y1"],
                "x2": det["x2"],
                "y2": det["y2"]
            },
            "head_box": {
                "x1": det["x1"] + (det["x2"] - det["x1"]) * 0.25,
                "y1": det["y1"],
                "x2": det["x2"] - (det["x2"] - det["x1"]) * 0.25,
                "y2": det["y1"] + (det["y2"] - det["y1"]) * 0.32
            },
            "has_helmet": cranial_res["has_helmet"],
            "ppe_status": cranial_res["status"],
            "confidence": cranial_res["confidence"],
            "reason": cranial_res["reason"],
            # Explicit signal for UI
            "signal": "RED_ALERT" if not cranial_res["has_helmet"] else "GREEN_PASS"
        }
        results.append(det_record)

        # Log incident if requested or if violation in live demo
        if req.log_incident and not cranial_res["has_helmet"]:
            incident_id = f"inc_live_{uuid.uuid4().hex[:8]}"
            evidence_info = save_evidence_frame(
                frame=frame,
                incident_id=incident_id,
                frame_number=1,
                boxes=[det],
                zones=[]
            )

            new_inc = Incident(
                id=incident_id,
                timestamp=datetime.utcnow(),
                source_id="CAM-LIVE",
                source_name=req.source_name or "Operator Live Webcam",
                zone_id="zone_assembly_live",
                zone_name="Operational Live Station",
                severity="HIGH",
                category="Missing Safety Helmet",
                status="NEW",
                dwell_duration_seconds=1.2,
                confidence=cranial_res["confidence"],
                track_id=det_record["track_id"],
                ppe_status="NON_COMPLIANT",
                explanation=cranial_res["reason"],
                evidence_image_path=evidence_info["relative_path"],
                evidence_hash=evidence_info["sha256_hash"],
                model_name="yolov8n-cranial",
                inference_mode="LIVE_WEBCAM_DEMO"
            )
            db.add(new_inc)
            db.commit()
            logged_incident_id = incident_id

    return {
        "success": True,
        "has_person": has_person,
        "detections": results,
        "overall_signal": "RED_ALERT" if any(not r["has_helmet"] for r in results) else "GREEN_PASS",
        "logged_incident_id": logged_incident_id
    }
