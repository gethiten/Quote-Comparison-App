"""Carrier CRUD endpoints."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Carrier
from app.schemas.schemas import CarrierCreate, CarrierOut

router = APIRouter(prefix="/carriers", tags=["carriers"])


@router.get("", response_model=list[CarrierOut])
def list_carriers(db: Session = Depends(get_db)):
    return db.query(Carrier).filter(Carrier.is_active.is_(True)).all()


@router.get("/{carrier_id}", response_model=CarrierOut)
def get_carrier(carrier_id: uuid.UUID, db: Session = Depends(get_db)):
    carrier = db.query(Carrier).filter(Carrier.id == carrier_id).first()
    if not carrier:
        raise HTTPException(status_code=404, detail="Carrier not found")
    return carrier


@router.post("", response_model=CarrierOut, status_code=201)
def create_carrier(payload: CarrierCreate, db: Session = Depends(get_db)):
    carrier = Carrier(**payload.model_dump())
    db.add(carrier)
    db.commit()
    db.refresh(carrier)
    return carrier
