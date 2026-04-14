"""Quote CRUD + file upload endpoints."""
import logging
import re
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func as sa_func, or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.models import Carrier, Comparison, ComparisonQuote, Property, Quote
from app.schemas.schemas import FileUploadResult, QuoteCreate, QuoteOut
from app.services.blob_service import upload_to_blob
from app.services.document_parser import parse_quote_document

router = APIRouter(prefix="/quotes", tags=["quotes"])
logger = logging.getLogger(__name__)


def _normalize_valuation_basis(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip().lower()
    if not normalized:
        return None
    if "replacement" in normalized or normalized == "rc":
        return "RC"
    if "actual cash" in normalized or normalized == "acv":
        return "ACV"
    return value


def _normalize_coverage_form(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip().lower()
    if not normalized:
        return None
    if "special" in normalized:
        return "Special"
    if "broad" in normalized:
        return "Broad"
    if "basic" in normalized:
        return "Basic"
    return value


def _normalize_carrier_name(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = " ".join(str(value).strip().split())
    return normalized or None


def _normalize_quote_number(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = re.sub(r"\s+", " ", str(value).strip())
    return normalized or None


def _canonical_quote_number(value: str | None) -> str | None:
    normalized = _normalize_quote_number(value)
    if not normalized:
        return None
    canonical = re.sub(r"[^A-Za-z0-9]+", "", normalized).upper()
    return canonical or None


def _normalize_quote_payload(payload: dict) -> dict:
    normalized = dict(payload)
    normalized["quote_number"] = _normalize_quote_number(normalized.get("quote_number"))
    normalized["valuation_basis"] = _normalize_valuation_basis(normalized.get("valuation_basis"))
    normalized["coverage_form"] = _normalize_coverage_form(normalized.get("coverage_form"))
    return normalized


def _find_duplicate_quote(
    db: Session,
    *,
    quote_number: str | None,
    carrier_id: uuid.UUID | None = None,
    carrier_name: str | None = None,
    exclude_quote_id: uuid.UUID | None = None,
) -> Quote | None:
    canonical_quote_number = _canonical_quote_number(quote_number)
    if not canonical_quote_number:
        return None

    query = db.query(Quote).join(Carrier, Quote.carrier_id == Carrier.id)
    carrier_filters = []
    if carrier_id:
        carrier_filters.append(Quote.carrier_id == carrier_id)

    normalized_carrier_name = _normalize_carrier_name(carrier_name)
    if normalized_carrier_name:
        carrier_filters.append(
            sa_func.lower(sa_func.trim(Carrier.carrier_name)) == normalized_carrier_name.lower()
        )

    if not carrier_filters:
        return None

    query = query.filter(or_(*carrier_filters)).filter(
        sa_func.upper(
            sa_func.regexp_replace(sa_func.coalesce(Quote.quote_number, ""), r"[^A-Za-z0-9]+", "", "g")
        ) == canonical_quote_number
    )
    if exclude_quote_id:
        query = query.filter(Quote.id != exclude_quote_id)
    return query.first()


@router.get("", response_model=list[QuoteOut])
def list_quotes(property_id: uuid.UUID | None = None, db: Session = Depends(get_db)):
    q = db.query(Quote).options(joinedload(Quote.carrier))
    if property_id:
        q = q.filter(Quote.property_id == property_id)
    return q.all()


@router.get("/{quote_id}", response_model=QuoteOut)
def get_quote(quote_id: uuid.UUID, db: Session = Depends(get_db)):
    quote = db.query(Quote).options(joinedload(Quote.carrier)).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote


@router.post("", response_model=QuoteOut, status_code=201)
def create_quote(payload: QuoteCreate, db: Session = Depends(get_db)):
    property_obj = db.query(Property).filter(Property.id == payload.property_id).first()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")

    quote_payload = _normalize_quote_payload(payload.model_dump(exclude={"carrier_name"}))
    duplicate_quote = _find_duplicate_quote(
        db,
        quote_number=quote_payload.get("quote_number"),
        carrier_id=quote_payload.get("carrier_id"),
        carrier_name=payload.carrier_name,
    )
    if duplicate_quote:
        raise HTTPException(
            status_code=409,
            detail=(
                f'Quote "{quote_payload.get("quote_number")}" for this carrier already exists '
                f'(existing quote id: {duplicate_quote.id}).'
            ),
        )

    quote = Quote(**quote_payload)
    db.add(quote)
    db.flush()

    comparison = (
        db.query(Comparison)
        .filter(Comparison.account_id == property_obj.account_id)
        .order_by(Comparison.created_at)
        .first()
    )
    if not comparison:
        comparison = Comparison(
            account_id=property_obj.account_id,
            client_name=property_obj.account.client_name if property_obj.account else "Quote Comparison",
            producer="System",
            notes="Auto-created when quote was added from the UI",
            status="active",
        )
        db.add(comparison)
        db.flush()

    next_order = (
        db.query(ComparisonQuote)
        .filter(ComparisonQuote.comparison_id == comparison.id)
        .count()
    )
    db.add(
        ComparisonQuote(
            comparison_id=comparison.id,
            quote_id=quote.id,
            display_order=next_order,
        )
    )

    db.commit()
    return (
        db.query(Quote)
        .options(joinedload(Quote.carrier))
        .filter(Quote.id == quote.id)
        .first()
    )


@router.put("/{quote_id}", response_model=QuoteOut)
def update_quote(quote_id: uuid.UUID, payload: QuoteCreate, db: Session = Depends(get_db)):
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    normalized_payload = _normalize_quote_payload(payload.model_dump(exclude={"carrier_name"}))
    duplicate_quote = _find_duplicate_quote(
        db,
        quote_number=normalized_payload.get("quote_number"),
        carrier_id=normalized_payload.get("carrier_id"),
        carrier_name=payload.carrier_name,
        exclude_quote_id=quote.id,
    )
    if duplicate_quote:
        raise HTTPException(
            status_code=409,
            detail=(
                f'Quote "{normalized_payload.get("quote_number")}" for this carrier already exists '
                f'(existing quote id: {duplicate_quote.id}).'
            ),
        )

    for k, v in normalized_payload.items():
        setattr(quote, k, v)
    db.commit()
    return (
        db.query(Quote)
        .options(joinedload(Quote.carrier))
        .filter(Quote.id == quote.id)
        .first()
    )


@router.delete("/{quote_id}", status_code=204)
def delete_quote(quote_id: uuid.UUID, db: Session = Depends(get_db)):
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    db.delete(quote)
    db.commit()


@router.post("/upload", response_model=FileUploadResult)
async def upload_quote_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a quote document (PDF, DOCX, XLSX), parse it, and return extracted data."""
    allowed = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload PDF, DOCX, or XLSX.")

    try:
        contents = await file.read()
        extracted = await parse_quote_document(contents, file.filename, file.content_type)
        extracted_data = extracted.model_dump(mode="json") if hasattr(extracted, "model_dump") else (extracted or {})

        duplicate_quote = _find_duplicate_quote(
            db,
            quote_number=extracted_data.get("quote_number"),
            carrier_name=extracted_data.get("carrier_name"),
        )
        if duplicate_quote:
            raise HTTPException(
                status_code=409,
                detail=(
                    f'Duplicate quote file detected: quote "{extracted_data.get("quote_number")}" '
                    f'for carrier "{extracted_data.get("carrier_name")}" already exists '
                    f'(existing quote id: {duplicate_quote.id}).'
                ),
            )

        blob_url = upload_to_blob(file.filename, contents, file.content_type)

        return FileUploadResult(
            filename=file.filename,
            blob_url=blob_url,
            extracted_data=extracted_data,
            message="File uploaded and parsed successfully.",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to upload or parse quote document %s", file.filename)
        raise HTTPException(status_code=500, detail="Failed to upload or parse the document.") from exc
