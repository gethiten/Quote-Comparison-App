"""Carrier CRUD endpoints."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func as sa_func
from sqlalchemy.exc import IntegrityError
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
    normalized_name = " ".join(payload.carrier_name.split())
    existing = (
        db.query(Carrier)
        .filter(sa_func.lower(sa_func.trim(Carrier.carrier_name)) == normalized_name.lower())
        .first()
    )
    if existing:
        return existing

    carrier_data = payload.model_dump()
    carrier_data["carrier_name"] = normalized_name

    carrier = Carrier(**carrier_data)
    db.add(carrier)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = (
            db.query(Carrier)
            .filter(sa_func.lower(sa_func.trim(Carrier.carrier_name)) == normalized_name.lower())
            .first()
        )
        if existing:
            return existing
        raise HTTPException(status_code=409, detail="A carrier with this name already exists")

    db.refresh(carrier)
    return carrier
