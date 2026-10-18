import os
import hashlib
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional
import cv2
import numpy as np
from backend.app.config import EVIDENCE_DIR

def calculate_sha256(filepath: Path) -> str:
    """Calculates SHA-256 hash of a file for tamper-detection checks."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def sanitize_path(target_path: Path, base_dir: Path) -> Path:
    """Ensures target_path resolves strictly within base_dir to prevent path traversal."""
    resolved_target = target_path.resolve()
    resolved_base = base_dir.resolve()
    if not str(resolved_target).startswith(str(resolved_base)):
        raise ValueError(f"Path traversal detected: {target_path}")
    return resolved_target

def save_evidence_frame(
    frame: np.ndarray,
    incident_id: str,
    frame_number: int,
    boxes: Optional[List[Dict[str, Any]]] = None,
    zones: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Annotates the video frame with bounding boxes and polygon zone overlays,
    saves it to the storage/evidence directory, and computes its SHA-256 hash.
    """
    annotated = frame.copy()
    h, w = annotated.shape[:2]

    # Draw zones
    if zones:
        for z in zones:
            coords = z.get("polygon_coords", [])
            if len(coords) >= 3:
                pts = np.array([[int(p["x"] * w), int(p["y"] * h)] for p in coords], np.int32)
                pts = pts.reshape((-1, 1, 2))
                # Fill transparent overlay
                overlay = annotated.copy()
                cv2.fillPoly(overlay, [pts], (0, 100, 255))
                cv2.addWeighted(overlay, 0.25, annotated, 0.75, 0, annotated)
                cv2.polylines(annotated, [pts], True, (0, 140, 255), 2)
                # Zone name label
                cv2.putText(
                    annotated,
                    z.get("name", "ZONE"),
                    (pts[0][0][0], pts[0][0][1] - 8),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 140, 255),
                    2
                )

    # Draw bounding boxes
    if boxes:
        for b in boxes:
            x1 = int(b["x1"] * w)
            y1 = int(b["y1"] * h)
            x2 = int(b["x2"] * w)
            y2 = int(b["y2"] * h)
            track_id = b.get("track_id")
            label = f"ID:{track_id} {b.get('class_name', 'person')} {b.get('confidence', 0):.2f}"
            
            # Box
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 128), 2)
            # Label background
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(annotated, (x1, y1 - 20), (x1 + tw + 6, y1), (0, 255, 128), -1)
            cv2.putText(annotated, label, (x1 + 3, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

            # Draw bottom-center foot contact point
            cx = int((x1 + x2) / 2)
            cy = y2
            cv2.circle(annotated, (cx, cy), 5, (0, 0, 255), -1)

    # Generate safe unique filename
    evidence_id = str(uuid.uuid4())
    filename = f"evidence_{incident_id}_{evidence_id[:8]}.jpg"
    file_path = EVIDENCE_DIR / filename
    sanitize_path(file_path, EVIDENCE_DIR)

    # Save JPEG
    cv2.imwrite(str(file_path), annotated, [cv2.IMWRITE_JPEG_QUALITY, 90])

    # Calculate SHA-256 hash
    sha256 = calculate_sha256(file_path)
    relative_path = f"evidence/{filename}"

    return {
        "id": evidence_id,
        "filename": filename,
        "relative_path": relative_path,
        "sha256_hash": sha256,
        "file_path": str(file_path),
        "frame_number": frame_number
    }
