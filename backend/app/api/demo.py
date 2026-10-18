from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.services.demo_service import load_demo_data, clear_demo_data

router = APIRouter()

@router.post("/demo/load")
def load_demo(db: Session = Depends(get_db)):
    return load_demo_data(db)

@router.delete("/demo/clear")
def clear_demo(db: Session = Depends(get_db)):
    return clear_demo_data(db)
