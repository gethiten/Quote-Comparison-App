"""Property CRUD endpoints."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Property
from app.schemas.schemas import PropertyCreate, PropertyOut

router = APIRouter(prefix="/properties", tags=["properties"])


@router.get("", response_model=list[PropertyOut])
def list_properties(account_id: uuid.UUID | None = None, db: Session = Depends(get_db)):
    q = db.query(Property)
    if account_id:
        q = q.filter(Property.account_id == account_id)
    return q.all()


@router.get("/{property_id}", response_model=PropertyOut)
def get_property(property_id: uuid.UUID, db: Session = Depends(get_db)):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop


@router.post("", response_model=PropertyOut, status_code=201)
def create_property(payload: PropertyCreate, db: Session = Depends(get_db)):
    prop = Property(**payload.model_dump())
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop


@router.put("/{property_id}", response_model=PropertyOut)
def update_property(property_id: uuid.UUID, payload: PropertyCreate, db: Session = Depends(get_db)):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    for k, v in payload.model_dump().items():
        setattr(prop, k, v)
    db.commit()
    db.refresh(prop)
    return prop


@router.delete("/{property_id}", status_code=204)
def delete_property(property_id: uuid.UUID, db: Session = Depends(get_db)):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    db.delete(prop)
    db.commit()
