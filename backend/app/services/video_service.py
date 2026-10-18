import os
import time
import uuid
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
import cv2
import numpy as np
from sqlalchemy.orm import Session

from backend.app.config import UPLOADS_DIR, EVIDENCE_DIR
from backend.app.database import SessionLocal
from backend.app.models.video import VideoSource
from backend.app.models.job import ProcessingJob
from backend.app.models.zone import RestrictedZone
from backend.app.models.incident import Incident
from backend.app.models.evidence import EvidenceFile
from backend.app.models.audit import AuditLog
from backend.app.services.inference_service import (
    detect_people,
    evaluate_ppe_compliance,
    SimpleTracker
)
from backend.app.services.zone_service import (
    point_in_polygon,
    get_bottom_center_reference_point,
    DwellTimeTracker
)
from backend.app.services.evidence_service import save_evidence_frame
from backend.app.services.rule_engine import SafetyRuleEngine

# Global stop flags: job_id -> bool
_job_stop_requested: Dict[str, bool] = {}


def request_job_stop(job_id: str):
    _job_stop_requested[job_id] = True


def get_video_metadata(video_path: Path) -> Dict[str, Any]:
    """Inspects video file using OpenCV and extracts dimensions, fps, duration."""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Unable to open video source: {video_path}")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = float(cap.get(cv2.CAP_PROP_FPS)) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = float(total_frames / fps) if fps > 0 else 0.0

    cap.release()
    return {
        "width": width,
        "height": height,
        "fps": fps,
        "total_frames": total_frames,
        "duration_seconds": round(duration, 2)
    }


def create_synthetic_test_video(output_path: Path, duration_seconds: int = 5, fps: int = 20) -> Path:
    """
    Generates a synthetic industrial camera video clip with two moving worker silhouettes
    moving through a warehouse workspace, for end-to-end pipeline verification.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    width, height = 640, 360
    total_frames = duration_seconds * fps

    # Try MP4V codec
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

    if not out.isOpened():
        # Fallback to AVI with MJPG if mp4v fails
        output_path = output_path.with_suffix('.avi')
        fourcc = cv2.VideoWriter_fourcc(*'MJPG')
        out = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

    for i in range(total_frames):
        # Industrial factory floor background
        frame = np.full((height, width, 3), (35, 40, 48), dtype=np.uint8)

        # Floor grid lines
        for y in range(100, height, 40):
            cv2.line(frame, (0, y), (width, y), (45, 52, 62), 1)

        # Restricted area hazard markings on floor
        cv2.rectangle(frame, (320, 120), (580, 310), (25, 30, 38), -1)
        for d in range(320, 580, 30):
            cv2.line(frame, (d, 120), (min(d + 20, 580), 310), (0, 160, 255), 2)

        # Text banner
        cv2.putText(frame, "AI SAFETY SENTINEL - SYNTHETIC INDUSTRIAL FEED", (20, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (160, 170, 185), 1)
        cv2.putText(frame, f"FRAME {i+1}/{total_frames} | TIME: {(i/fps):.2f}s", (20, 55),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (100, 200, 120), 1)

        # Worker 1: Walking from left (x=80) to right into the restricted zone (x=450)
        t = i / total_frames
        w1_x = int(80 + t * 370)
        w1_y = 170

        # Draw person 1 (head, body, legs)
        # Head
        cv2.circle(frame, (w1_x, w1_y - 35), 12, (200, 190, 180), -1)
        # Hard hat (yellow)
        cv2.ellipse(frame, (w1_x, w1_y - 42), (14, 6), 0, 0, 180, (0, 220, 240), -1)
        # Torso / High-vis vest (bright orange)
        cv2.rectangle(frame, (w1_x - 14, w1_y - 23), (w1_x + 14, w1_y + 35), (0, 140, 255), -1)
        # Reflective stripes
        cv2.line(frame, (w1_x - 14, w1_y), (w1_x + 14, w1_y), (240, 240, 240), 2)
        # Legs
        cv2.line(frame, (w1_x - 7, w1_y + 35), (w1_x - 7, w1_y + 85), (80, 80, 90), 5)
        cv2.line(frame, (w1_x + 7, w1_y + 35), (w1_x + 7, w1_y + 85), (80, 80, 90), 5)

        # Worker 2: Standing near right edge (x=500, y=140) without hard hat
        w2_x = 510
        w2_y = 150
        # Head (dark hair, no helmet)
        cv2.circle(frame, (w2_x, w2_y - 30), 10, (180, 160, 150), -1)
        # Torso (blue work shirt, no hi-vis vest)
        cv2.rectangle(frame, (w2_x - 12, w2_y - 20), (w2_x + 12, w2_y + 30), (140, 70, 40), -1)
        # Legs
        cv2.line(frame, (w2_x - 6, w2_y + 30), (w2_x - 6, w2_y + 75), (50, 50, 60), 4)
        cv2.line(frame, (w2_x + 6, w2_y + 30), (w2_x + 6, w2_y + 75), (50, 50, 60), 4)

        out.write(frame)

    out.release()
    return output_path


def run_video_job(job_id: str):
    """
    Background worker thread function that processes a video job end-to-end.
    Updates the database with progress, frame counts, and generates evidence-backed incidents.
    """
    db: Session = SessionLocal()
    _job_stop_requested[job_id] = False

    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not job:
        db.close()
        return

    video = db.query(VideoSource).filter(VideoSource.id == job.video_id).first()
    if not video or not os.path.exists(video.filepath):
        job.status = "FAILED"
        job.error_message = f"Video file not found on disk: {video.filepath if video else 'None'}"
        db.commit()
        db.close()
        return

    # Load active restricted zones
    zones = db.query(RestrictedZone).filter(RestrictedZone.is_active == True).all()
    zone_dicts = []
    for z in zones:
        try:
            coords = json.loads(z.polygon_coords)
            req_ppe = json.loads(z.required_ppe) if z.required_ppe else []
            zone_dicts.append({
                "id": z.id,
                "name": z.name,
                "polygon_coords": coords,
                "severity": z.severity,
                "dwell_time": z.dwell_time_seconds,
                "required_ppe": req_ppe
            })
        except Exception:
            continue

    cap = cv2.VideoCapture(video.filepath)
    if not cap.isOpened():
        job.status = "FAILED"
        job.error_message = f"OpenCV could not open video: {video.filepath}"
        db.commit()
        db.close()
        return

    job.status = "RUNNING"
    job.total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 100
    db.commit()

    tracker = SimpleTracker()
    dwell_tracker = DwellTimeTracker()
    rule_engine = SafetyRuleEngine(deduplication_window_seconds=8.0)

    fps = float(cap.get(cv2.CAP_PROP_FPS)) or 25.0
    frame_idx = 0
    total_persons_observed = set()
    incident_count = 0
    start_time = time.time()

    try:
        while cap.isOpened():
            if _job_stop_requested.get(job_id, False):
                job.status = "STOPPED"
                break

            ret, frame = cap.read()
            if not ret or frame is None:
                break

            frame_idx += 1
            current_sec = frame_idx / fps

            # 1. Run real person detection
            detections, det_err = detect_people(frame, confidence_threshold=0.35)

            # 2. Update tracking
            tracked_detections = tracker.update(detections)
            for td in tracked_detections:
                total_persons_observed.add(td["track_id"])

            # 3. Evaluate each tracked person against active zones
            active_dwell_keys = []
            for person in tracked_detections:
                track_id = person["track_id"]
                cx, cy = get_bottom_center_reference_point(
                    person["x1"], person["y1"], person["x2"], person["y2"]
                )

                for z in zone_dicts:
                    in_zone = point_in_polygon(cx, cy, z["polygon_coords"])
                    if in_zone:
                        active_dwell_keys.append((track_id, z["id"]))
                        dwell_triggered = dwell_tracker.update(
                            track_id=track_id,
                            zone_id=z["id"],
                            current_time=current_sec,
                            dwell_threshold_seconds=z["dwell_time"]
                        )

                        if dwell_triggered:
                            # Check rule engine deduplication
                            if not rule_engine.is_duplicate(
                                source_id=video.filename,
                                track_id=track_id,
                                event_type="RESTRICTED_ZONE_VIOLATION",
                                zone_id=z["id"],
                                current_time=current_sec
                            ):
                                # PPE assessment
                                ppe_result = evaluate_ppe_compliance(
                                    frame, person, z.get("required_ppe", [])
                                )
                                ppe_status = ppe_result["status"]

                                # Determine event type & severity
                                is_combined = rule_engine.should_combine(
                                    zone_violation=True,
                                    ppe_non_compliant=(ppe_status == "NON_COMPLIANT")
                                )
                                event_type = "ZONE_AND_PPE_VIOLATION" if is_combined else "RESTRICTED_ZONE_VIOLATION"
                                sev, rationale = rule_engine.evaluate_severity(
                                    event_type=event_type,
                                    zone_severity=z["severity"],
                                    ppe_status=ppe_status
                                )

                                incident_id = f"inc_{uuid.uuid4().hex[:10]}"

                                # Save evidence frame
                                ev_meta = save_evidence_frame(
                                    frame=frame,
                                    incident_id=incident_id,
                                    frame_number=frame_idx,
                                    boxes=[person],
                                    zones=[z]
                                )

                                # Create Evidence record
                                ev_record = EvidenceFile(
                                    id=ev_meta["id"],
                                    incident_id=incident_id,
                                    filename=ev_meta["filename"],
                                    relative_path=ev_meta["relative_path"],
                                    sha256_hash=ev_meta["sha256_hash"],
                                    frame_number=frame_idx,
                                    bounding_boxes=json.dumps([person])
                                )
                                db.add(ev_record)

                                # Create Incident record
                                inc = Incident(
                                    id=incident_id,
                                    event_type=event_type,
                                    severity=sev,
                                    status="NEW",
                                    source_id=video.filename,
                                    zone_id=z["id"],
                                    track_id=track_id,
                                    confidence=person["confidence"],
                                    ppe_status=ppe_status,
                                    explanation=f"{rationale} (Track ID #{track_id} in {z['name']} at {current_sec:.1f}s)",
                                    evidence_id=ev_meta["id"],
                                    model_name="yolov8n",
                                    inference_mode="REAL",
                                    is_demo=False
                                )
                                db.add(inc)

                                # Audit log
                                audit = AuditLog(
                                    id=str(uuid.uuid4()),
                                    incident_id=incident_id,
                                    action="CREATED",
                                    actor="AI_PIPELINE",
                                    details=f"Automated incident created via real video inference on frame {frame_idx}."
                                )
                                db.add(audit)
                                incident_count += 1
                                db.commit()

            dwell_tracker.prune_stale(active_dwell_keys, timeout_seconds=4.0, current_time=current_sec)

            # Periodic job progress update every 10 frames
            if frame_idx % 10 == 0 or frame_idx == job.total_frames:
                elapsed = time.time() - start_time
                fps_calc = frame_idx / elapsed if elapsed > 0 else 0.0
                job.processed_frames = frame_idx
                job.current_timestamp = round(current_sec, 2)
                job.progress = min(100.0, round((frame_idx / job.total_frames) * 100.0, 1))
                job.fps_measured = round(fps_calc, 1)
                job.person_count = len(total_persons_observed)
                job.incident_count = incident_count
                db.commit()

        if job.status != "STOPPED":
            job.status = "COMPLETED"
            job.progress = 100.0

    except Exception as e:
        job.status = "FAILED"
        job.error_message = f"Job processing aborted: {str(e)}"
    finally:
        cap.release()
        job.processed_frames = frame_idx
        job.person_count = len(total_persons_observed)
        job.incident_count = incident_count
        db.commit()
        db.close()
