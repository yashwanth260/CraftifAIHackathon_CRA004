#!/usr/bin/env python3
"""
Seeds sample industrial safety records into the AI Safety Sentinel 360 database.
"""
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.database import SessionLocal, init_db
from backend.app.services.demo_service import load_demo_data

def main():
    print("Initializing database tables...")
    init_db()
    db = SessionLocal()
    try:
        print("Seeding demo restricted zones and safety incidents...")
        res = load_demo_data(db)
        print(f"Success: {res.get('message')}")
        print(f"Zones Created: {res.get('zones_created')}")
        print(f"Incidents Created: {res.get('incidents_created')}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
