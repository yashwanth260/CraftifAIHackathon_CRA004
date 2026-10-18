import asyncio
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from backend.app.database import init_db
from backend.app.services.inference_service import load_person_detector
from backend.app.api import (
    health,
    videos,
    jobs,
    zones,
    incidents,
    analytics,
    demo,
    pipeline,
    evidence,
    live_camera
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    init_db()
    # Attempt to load person detector (non-blocking)
    load_person_detector("yolov8n.pt")
    yield

app = FastAPI(
    title="AI Safety Sentinel 360",
    description="AI-Powered Industrial Safety and PPE Compliance Monitoring API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup for development and frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(health.router, prefix="/api", tags=["System & Health"])
app.include_router(videos.router, prefix="/api", tags=["Video Sources"])
app.include_router(jobs.router, prefix="/api", tags=["Processing Jobs"])
app.include_router(zones.router, prefix="/api", tags=["Restricted Zones"])
app.include_router(incidents.router, prefix="/api", tags=["Incidents & Audit"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics & Reporting"])
app.include_router(demo.router, prefix="/api", tags=["Demo Mode"])
app.include_router(pipeline.router, prefix="/api", tags=["PipeGen Integration"])
app.include_router(evidence.router, prefix="/api", tags=["Evidence Files"])
app.include_router(live_camera.router, prefix="/api", tags=["Live Camera Demo"])

@app.get("/api/events/stream")
async def event_stream():
    """
    Server-Sent Events endpoint for real-time monitoring updates on dashboard.
    Emits heartbeat and periodic status events.
    """
    async def event_generator():
        while True:
            await asyncio.sleep(3.0)
            payload = json.dumps({"event": "heartbeat", "status": "ONLINE"})
            yield f"data: {payload}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
