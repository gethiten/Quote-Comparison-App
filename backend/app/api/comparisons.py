"""Comparison CRUD + scoring endpoints."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.models import Comparison, ComparisonQuote, Quote
from app.schemas.schemas import ComparisonCreate, ComparisonOut, ComparisonUpdate, QuoteOut, ScoredQuote
from app.services.scoring_service import rank_quotes

router = APIRouter(prefix="/comparisons", tags=["comparisons"])


@router.get("", response_model=list[ComparisonOut])
def list_comparisons(account_id: uuid.UUID | None = None, db: Session = Depends(get_db)):
    q = db.query(Comparison)
    if account_id:
        q = q.filter(Comparison.account_id == account_id)
    comps = q.all()
    result = []
    for comp in comps:
        cq = (
            db.query(ComparisonQuote)
            .options(joinedload(ComparisonQuote.quote).joinedload(Quote.carrier))
            .filter(ComparisonQuote.comparison_id == comp.id)
            .order_by(ComparisonQuote.display_order)
            .all()
        )
        out = ComparisonOut.model_validate(comp)
        out.quotes = [QuoteOut.model_validate(cq_item.quote) for cq_item in cq]
        result.append(out)
    return result


@router.get("/{comparison_id}", response_model=ComparisonOut)
def get_comparison(comparison_id: uuid.UUID, db: Session = Depends(get_db)):
    comp = db.query(Comparison).filter(Comparison.id == comparison_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Comparison not found")
    cq = (
        db.query(ComparisonQuote)
        .options(joinedload(ComparisonQuote.quote).joinedload(Quote.carrier))
        .filter(ComparisonQuote.comparison_id == comp.id)
        .order_by(ComparisonQuote.display_order)
        .all()
    )
    out = ComparisonOut.model_validate(comp)
    out.quotes = [QuoteOut.model_validate(cq_item.quote) for cq_item in cq]
    return out


@router.post("", response_model=ComparisonOut, status_code=201)
def create_comparison(payload: ComparisonCreate, db: Session = Depends(get_db)):
    weights = payload.score_weights
    comp = Comparison(
        account_id=payload.account_id,
        client_name=payload.client_name,
        producer=payload.producer,
        notes=payload.notes,
        status=payload.status,
        score_weight_premium=weights.premium if weights else 35,
        score_weight_coverage=weights.coverage_breadth if weights else 30,
        score_weight_carrier_rating=weights.carrier_rating if weights else 20,
        score_weight_deductibles=weights.deductibles if weights else 15,
    )
    db.add(comp)
    db.flush()

    for idx, qid in enumerate(payload.quote_ids):
        cq = ComparisonQuote(comparison_id=comp.id, quote_id=qid, display_order=idx)
        db.add(cq)

    db.commit()
    db.refresh(comp)
    return get_comparison(comp.id, db)


@router.put("/{comparison_id}", response_model=ComparisonOut)
def update_comparison(comparison_id: uuid.UUID, payload: ComparisonUpdate, db: Session = Depends(get_db)):
    comp = db.query(Comparison).filter(Comparison.id == comparison_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Comparison not found")

    if payload.notes is not None:
        comp.notes = payload.notes
    if payload.recommended_quote_id is not None:
        comp.recommended_quote_id = payload.recommended_quote_id
    if payload.status is not None:
        comp.status = payload.status
    if payload.score_weights:
        comp.score_weight_premium = payload.score_weights.premium
        comp.score_weight_coverage = payload.score_weights.coverage_breadth
        comp.score_weight_carrier_rating = payload.score_weights.carrier_rating
        comp.score_weight_deductibles = payload.score_weights.deductibles

    db.commit()
    db.refresh(comp)
    return get_comparison(comp.id, db)


@router.delete("/{comparison_id}", status_code=204)
def delete_comparison(comparison_id: uuid.UUID, db: Session = Depends(get_db)):
    comp = db.query(Comparison).filter(Comparison.id == comparison_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Comparison not found")
    db.delete(comp)
    db.commit()


@router.get("/{comparison_id}/score", response_model=list[ScoredQuote])
def score_comparison(comparison_id: uuid.UUID, db: Session = Depends(get_db)):
    comp = db.query(Comparison).filter(Comparison.id == comparison_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Comparison not found")

    cq = (
        db.query(ComparisonQuote)
        .options(joinedload(ComparisonQuote.quote).joinedload(Quote.carrier))
        .filter(ComparisonQuote.comparison_id == comp.id)
        .all()
    )
    quotes = [cq_item.quote for cq_item in cq]
    weights = {
        "premium": comp.score_weight_premium,
        "coverageBreadth": comp.score_weight_coverage,
        "carrierRating": comp.score_weight_carrier_rating,
        "deductibles": comp.score_weight_deductibles,
    }
    return rank_quotes(quotes, weights)
