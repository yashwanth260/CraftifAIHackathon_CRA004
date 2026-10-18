#!/usr/bin/env python3
"""
CraftifAI PipeGen — AI Safety Sentinel 360 Edge Pipeline Runner
----------------------------------------------------------------
Executes the generated video-perception pipeline on an input video or camera stream,
detects persons using YOLOv8, tracks movement across frames, checks polygon-based
restricted zones, and produces structured JSON safety incident events.
"""

import sys
import os
import json
import time
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
from pathlib import Path
import cv2
import httpx

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.services.inference_service import detect_people, SimpleTracker
from backend.app.services.zone_service import point_in_polygon, get_bottom_center_reference_point, DwellTimeTracker
from backend.app.services.rule_engine import SafetyRuleEngine


def run_pipeline(
    video_source: str,
    zones_file: Optional[str] = None,
    api_endpoint: Optional[str] = "http://127.0.0.1:8000/api/pipeline/events",
    output_jsonl: Optional[str] = "storage/exports/pipegen_events.jsonl",
    max_frames: int = 200
):
    print(f"=== CraftifAI PipeGen Pipeline: ai-safety-sentinel-360 ===")
    print(f"Source: {video_source}")
    print(f"API Target: {api_endpoint or 'Disabled'}")

    # Load zones
    zones = []
    if zones_file and os.path.exists(zones_file):
        with open(zones_file, "r") as f:
            zones = json.load(f)
        print(f"Loaded {len(zones)} zone definitions from {zones_file}")
    else:
        # Default safety zone
        zones = [{
            "id": "pipegen_restricted_zone_01",
            "name": "Robotic Workstation Perimeter",
            "polygon_coords": [
                {"x": 0.35, "y": 0.25},
                {"x": 0.85, "y": 0.25},
                {"x": 0.85, "y": 0.85},
                {"x": 0.35, "y": 0.85}
            ],
            "severity": "HIGH",
            "dwell_time": 1.0
        }]
        print("Using default restricted zone geometry.")

    cap = cv2.VideoCapture(video_source)
    if not cap.isOpened():
        print(f"Error: Unable to open video source '{video_source}'")
        return False

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    tracker = SimpleTracker()
    dwell_tracker = DwellTimeTracker()
    rule_engine = SafetyRuleEngine(deduplication_window_seconds=10.0)

    events_generated = []
    frame_idx = 0
    start_time = time.time()

    if output_jsonl:
        Path(output_jsonl).parent.mkdir(parents=True, exist_ok=True)
        out_f = open(output_jsonl, "a")
    else:
        out_f = None

    try:
        while cap.isOpened() and frame_idx < max_frames:
            ret, frame = cap.read()
            if not ret or frame is None:
                break

            frame_idx += 1
            curr_sec = frame_idx / fps

            # 1. Detection
            detections, err = detect_people(frame, confidence_threshold=0.40)
            if err:
                print(f"[Frame {frame_idx}] Detection warning: {err}")
                continue

            # 2. Tracking
            tracked = tracker.update(detections)

            # 3. Zone evaluation
            active_keys = []
            for person in tracked:
                track_id = person["track_id"]
                cx, cy = get_bottom_center_reference_point(
                    person["x1"], person["y1"], person["x2"], person["y2"]
                )

                for z in zones:
                    in_zone = point_in_polygon(cx, cy, z["polygon_coords"])
                    if in_zone:
                        active_keys.append((track_id, z["id"]))
                        triggered = dwell_tracker.update(
                            track_id=track_id,
                            zone_id=z["id"],
                            current_time=curr_sec,
                            dwell_threshold_seconds=z.get("dwell_time", 1.0)
                        )

                        if triggered and not rule_engine.is_duplicate(
                            source_id=Path(video_source).name,
                            track_id=track_id,
                            event_type="RESTRICTED_ZONE_VIOLATION",
                            zone_id=z["id"],
                            current_time=curr_sec
                        ):
                            # Generate event matching Part A8 schema
                            event = {
                                "event_id": f"pipegen_{uuid.uuid4().hex[:12]}",
                                "timestamp": datetime.utcnow().isoformat() + "Z",
                                "source_id": Path(video_source).name,
                                "track_id": track_id,
                                "event_type": "RESTRICTED_ZONE_VIOLATION",
                                "zone_id": z["id"],
                                "severity": z.get("severity", "HIGH"),
                                "confidence": round(person["confidence"], 2),
                                "ppe_status": "NOT_EVALUATED",
                                "evidence_reference": None,
                                "model_name": "yolov8n",
                                "inference_mode": "REAL",
                                "explanation": f"Track #{track_id} detected inside {z['name']} (Dwell threshold satisfied)"
                            }

                            events_generated.append(event)
                            print(f"[ALERT] Event generated: {event['event_id']} - {event['explanation']}")

                            if out_f:
                                out_f.write(json.dumps(event) + "\n")
                                out_f.flush()

                            # Dispatch to backend API if running
                            if api_endpoint:
                                try:
                                    resp = httpx.post(api_endpoint, json=event, timeout=2.0)
                                    if resp.status_code == 200:
                                        print(f" -> Successfully forwarded to API: {resp.json().get('status')}")
                                except Exception as e:
                                    # Non-fatal if server is not currently running
                                    pass

            dwell_tracker.prune_stale(active_keys, timeout_seconds=3.0, current_time=curr_sec)

        elapsed = time.time() - start_time
        print("\n=== Execution Summary ===")
        print(f"Frames processed: {frame_idx}")
        print(f"Time taken: {elapsed:.2f} seconds ({frame_idx/elapsed:.1f} FPS)")
        print(f"Events produced: {len(events_generated)}")

    finally:
        cap.release()
        if out_f:
            out_f.close()

    return True


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run AI Safety Sentinel PipeGen Pipeline")
    parser.add_argument("--source", type=str, default=None, help="Path to video file")
    parser.add_argument("--zones", type=str, default=None, help="Path to zones JSON")
    parser.add_argument("--api", type=str, default="http://127.0.0.1:8000/api/pipeline/events", help="API webhook")
    parser.add_argument("--output", type=str, default="storage/exports/pipegen_events.jsonl", help="Output JSONL")
    parser.add_argument("--max-frames", type=int, default=150, help="Max frames to process")
    args = parser.parse_args()

    # If no source provided, generate or use sample video
    source_file = args.source
    if not source_file or not os.path.exists(source_file):
        from backend.app.services.video_service import create_synthetic_test_video
        sample_path = PROJECT_ROOT / "storage" / "uploads" / "pipegen_test_feed.mp4"
        if not sample_path.exists():
            create_synthetic_test_video(sample_path, duration_seconds=5, fps=20)
        source_file = str(sample_path)

    run_pipeline(
        video_source=source_file,
        zones_file=args.zones,
        api_endpoint=args.api,
        output_jsonl=args.output,
        max_frames=args.max_frames
    )
