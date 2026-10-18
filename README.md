# AI Safety Sentinel 360

> **AI-Powered Industrial Safety & PPE Compliance Monitoring System**  
> Edge Computer Vision, Restricted-Zone Perimeter Monitoring, Hierarchical PPE Verification, and Operator Incident Review Dashboard.

---

## 1. System Overview

**AI Safety Sentinel 360** is a full-stack edge computer-vision application built for factories, warehouses, automated robotic cells, and construction sites. The system continuously monitors video feeds, detects humans, tracks movement across frames, evaluates polygon-defined restricted zones, and inspects personal protective equipment (safety hard hats and high-visibility vests) with cryptographic evidence capture.

### Key Capabilities
- **Real Person Detection & Tracking**: Uses Ultralytics YOLOv8 object detection combined with an IoU/Euclidean tracker to maintain session identities without biometric facial recognition.
- **Feet-Ground Polygon Containment**: Evaluates bottom-center reference points against user-defined normalized polygons with configurable dwell-time thresholds.
- **Hierarchical PPE Compliance**: Inspects head and torso regions for safety helmets and high-visibility vests when compatible model weights are loaded; honestly outputs `NOT_EVALUATED` or `UNCERTAIN` when weights are absent or view is occluded.
- **CraftifAI PipeGen Integration**: Built-in adapter ingests structured edge JSON events conforming to the PipeGen Part A8 schema.
- **Evidence Management**: Captures annotated JPEG frames with polygon overlays and computes SHA-256 hashes for tamper verification.
- **Incident Center**: Review lifecycle (`NEW` → `ACKNOWLEDGED` → `UNDER_REVIEW` → `RESOLVED` / `DISMISSED`) with operator notes, audit trail history, and CSV export.
- **Demo Mode**: Instant seeding and clearing of realistic sample data isolated by `is_demo=True`.

---

## 2. Verified Features vs. Hardware Dependencies

In adherence to strict engineering honesty:

| Feature | Status | Environment Required |
|---|---|---|
| **Restricted Zone Monitoring** | **VERIFIED & WORKING** | Any CPU / GPU host |
| **Real Person Detection & Tracking** | **VERIFIED & WORKING** | Host CPU with Ultralytics PyTorch |
| **PipeGen Event Ingestion Adapter** | **VERIFIED & WORKING** | HTTP REST endpoint `/api/pipeline/events` |
| **Demo Mode & Incident Review Lifecycle** | **VERIFIED & WORKING** | SQLite database |
| **Automated Pytest & Frontend Build** | **VERIFIED & WORKING** | 16/16 backend tests passed, Vite build OK |
| **Dedicated PPE Detection Weights** | **AWAITING MODEL** | Returns honest `NOT_EVALUATED` until custom weights provided |
| **TensorRT / Jetson Hardware Compilation** | **AWAITING HW** | Requires NVIDIA Jetson / CUDA GPU environment |

---

## 3. Quick Start (Windows & Linux)

### Prerequisites
- **Python 3.10+** (Python 3.12 verified)
- **Node.js 18+** & **npm**

### Backend Setup & Startup

1. **Install Python dependencies:**
   ```powershell
   # Windows PowerShell
   pip install -r backend/requirements.txt
   ```
   ```bash
   # Linux / macOS
   pip3 install -r backend/requirements.txt
   ```

2. **Start the FastAPI backend server:**
   ```powershell
   # Windows PowerShell / Batch
   python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   # Or double-click: scripts/start_backend.bat
   ```
   ```bash
   # Linux / macOS
   uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

   The interactive API docs will be accessible at: `http://127.0.0.1:8000/docs`

### Frontend Setup & Startup

1. **Install npm dependencies and launch development server:**
   ```powershell
   # Windows PowerShell
   cd frontend
   npm install
   npm run dev
   # Or double-click: scripts/start_frontend.bat
   ```
   ```bash
   # Linux / macOS
   cd frontend
   npm install
   npm run dev
   ```

2. **Open Dashboard:**
   Visit `http://localhost:5173` in your web browser.

---

## 4. How to Use the System

### 4.1 Running Demo Mode
1. Click the **"Load Demo Data"** button in the top navigation bar.
2. The dashboard updates immediately with 6 realistic incident records, 2 sample zones ("Automated Robotic Cell #3", "High-Speed Forklift Transit Lane"), and analytics charts.
3. A prominent **DEMO MODE** badge appears.
4. To clean up all demo records without affecting real data, click **"Clear Demo Data"**.

### 4.2 Video Analysis & Instant Testing
1. Navigate to **Video Analysis** (`/video-analysis`).
2. If you do not have an MP4 file ready, click **"Generate Test Video Feed"**. The system generates a synthetic 640x360 warehouse video with moving worker silhouettes.
3. Select the video and click **"Start Computer Vision Inference Job"**.
4. Monitor live progress, processed frames, FPS throughput, and flagged safety violations.

### 4.3 Creating and Editing Restricted Zones
1. Navigate to **Restricted Zones** (`/zones`).
2. Click **"Define New Zone"**.
3. Click anywhere on the interactive canvas to place polygon vertices. Coordinates are automatically normalized `[0.0 - 1.0]`.
4. Configure zone name, color, severity tier (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), dwell-time threshold (seconds), and mandatory PPE.
5. Click **"Save Zone"**.

### 4.4 Reviewing Incidents & Evidence
1. Navigate to **Incident Center** (`/incidents`).
2. Filter by severity, review status, or text search.
3. Click **"Inspect"** on any record to open the review drawer.
4. View the saved evidence frame with overlay bounding boxes and SHA-256 cryptographic hash.
5. Transition status to **Acknowledged**, **Under Review**, **Resolved**, or **Dismissed** with operator notes.
6. Click **"Export CSV Audit Log"** to download a structured spreadsheet report.

---

## 5. CraftifAI PipeGen Integration

The project includes complete PipeGen Part A specifications in the `pipegen/` directory:
- `pipegen/ai_safety_sentinel_360_spec.json`: Full PipeGen requirement specification.
- `pipegen/pipeline_ir.json`: Inspectable Pipeline Intermediate Representation graph.
- `pipegen/pipegen_pipeline.py`: Standalone edge pipeline runner.
- `pipegen/sample_pipegen_event.json`: Schema V1 sample output event.

### Running Standalone PipeGen Pipeline
```powershell
python pipegen/pipegen_pipeline.py --max-frames 100
```
This processes video frames, detects people, tracks movement, checks zone geometry, and sends structured JSON alerts directly to `http://127.0.0.1:8000/api/pipeline/events`.

---

## 6. Running Automated Tests

Run the full automated test suite:
```powershell
# Windows
.\scripts\run_tests.bat

# Or run pytest directly
python -m pytest backend/tests -v
```

### Verified Test Suite Summary
- `test_health.py`: Health check and system diagnostic endpoints.
- `test_zones.py`: Polygon containment math, CRUD, and vertex validation.
- `test_rule_engine.py`: Incident deduplication, severity evaluation, compound violations.
- `test_incidents.py`: Incident lifecycle transitions, audit logs, CSV export.
- `test_pipeline_adapter.py`: PipeGen schema validation, rejection of malformed events.
- `test_demo_mode.py`: Demo dataset isolation and clearing cycle.
- `test_evidence.py`: Path traversal prevention and SHA-256 integrity check.
- `npm run build`: Production TypeScript verification and Vite bundle build.

---

## 7. Future TensorRT & NVIDIA Jetson Deployment

To deploy this pipeline onto an NVIDIA Jetson AGX Orin or Linux GPU server with TensorRT:
1. Export YOLOv8 model to ONNX:
   ```bash
   yolo export model=yolov8n.pt format=onnx dynamic=True
   ```
2. Build TensorRT engine via `trtexec`:
   ```bash
   trtexec --onnx=yolov8n.onnx --saveEngine=yolov8n_fp16.engine --fp16
   ```
3. Load the resulting `.engine` file via `POST /api/models/configure` or set `YOLO_PERSON_MODEL=yolov8n_fp16.engine`.
