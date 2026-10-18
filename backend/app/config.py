import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
EVIDENCE_DIR = STORAGE_DIR / "evidence"
EXPORTS_DIR = STORAGE_DIR / "exports"
SAMPLE_DATA_DIR = BASE_DIR / "sample_data"

# Ensure runtime directories exist
for directory in [STORAGE_DIR, UPLOADS_DIR, EVIDENCE_DIR, EXPORTS_DIR, SAMPLE_DATA_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{STORAGE_DIR}/sentinel.db")

# Model configuration
YOLO_PERSON_MODEL = os.getenv("YOLO_PERSON_MODEL", "yolov8n.pt")
PPE_MODEL_PATH = os.getenv("PPE_MODEL_PATH", "")  # Empty by default -> NOT_EVALUATED
PERSON_CONFIDENCE_THRESHOLD = float(os.getenv("PERSON_CONFIDENCE_THRESHOLD", "0.45"))
PPE_CONFIDENCE_THRESHOLD = float(os.getenv("PPE_CONFIDENCE_THRESHOLD", "0.50"))

# PipeGen integration
PIPEGEN_EVENT_DIR = BASE_DIR / "pipegen"
DEDUPLICATION_WINDOW_SECONDS = float(os.getenv("DEDUPLICATION_WINDOW_SECONDS", "10.0"))

# Evidence settings
EVIDENCE_RETENTION_DAYS = int(os.getenv("EVIDENCE_RETENTION_DAYS", "30"))
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "250"))
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
