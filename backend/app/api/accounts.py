"""Account CRUD endpoints."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.models import Account
from app.schemas.schemas import AccountCreate, AccountOut

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(Account).options(joinedload(Account.properties)).all()


@router.get("/{account_id}", response_model=AccountOut)
def get_account(account_id: uuid.UUID, db: Session = Depends(get_db)):
    acct = (
        db.query(Account)
        .options(joinedload(Account.properties))
        .filter(Account.id == account_id)
        .first()
    )
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")
    return acct


@router.post("", response_model=AccountOut, status_code=201)
def create_account(payload: AccountCreate, db: Session = Depends(get_db)):
    acct = Account(**payload.model_dump())
    db.add(acct)
    db.commit()
    db.refresh(acct)
    return acct


@router.delete("/{account_id}", status_code=204)
def delete_account(account_id: uuid.UUID, db: Session = Depends(get_db)):
    acct = db.query(Account).filter(Account.id == account_id).first()
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")
    db.delete(acct)
    db.commit()
