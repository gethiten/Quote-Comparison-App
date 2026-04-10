"""AI analysis endpoints."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.agents.comparison_agent import analyze_quotes
from app.database import get_db
from app.models.models import Comparison, ComparisonQuote, Property, Quote

router = APIRouter(prefix="/ai", tags=["ai"])


class AnalysisResponse(BaseModel):
    comparison_id: str
    analysis: str


@router.get("/analyze/{comparison_id}", response_model=AnalysisResponse)
async def ai_analyze_comparison(comparison_id: uuid.UUID, db: Session = Depends(get_db)):
    """Get AI-powered analysis and recommendation for a comparison."""
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

    if not quotes:
        raise HTTPException(status_code=400, detail="No quotes in this comparison")

    # Get the property info from the first quote
    prop = db.query(Property).filter(Property.id == quotes[0].property_id).first()
    property_info = {
        "address": prop.address if prop else "",
        "city": prop.city if prop else "",
        "state": prop.state if prop else "",
        "type": prop.type.value if prop else "",
        "sq_footage": prop.sq_footage if prop else 0,
        "insured_value": prop.insured_value if prop else 0,
    }

    quotes_data = []
    for q in quotes:
        quotes_data.append({
            "carrier": q.carrier.carrier_name if q.carrier else "Unknown",
            "am_best": q.carrier.am_best_rating if q.carrier else None,
            "premium": q.annual_premium,
            "building_limit": q.building_limit,
            "valuation": q.valuation_basis.value if q.valuation_basis else None,
            "coverage_form": q.coverage_form.value if q.coverage_form else None,
            "coinsurance": q.coinsurance,
            "aop_deductible": q.aop_deductible,
            "wind_hail_pct": q.wind_hail_deductible_pct,
            "flood_limit": q.flood_limit,
            "bi_limit": q.business_interruption_limit,
            "equipment_breakdown": q.equipment_breakdown,
            "ordinance_or_law": q.ordinance_or_law,
        })

    result = await analyze_quotes(quotes_data, property_info)
    if not result:
        raise HTTPException(
            status_code=503,
            detail="AI analysis unavailable. Configure Azure OpenAI credentials.",
        )

    return AnalysisResponse(comparison_id=str(comparison_id), analysis=result)
