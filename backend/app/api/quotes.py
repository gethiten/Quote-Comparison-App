"""Quote CRUD + file upload endpoints."""
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.models import Comparison, ComparisonQuote, Property, Quote
from app.schemas.schemas import FileUploadResult, QuoteCreate, QuoteOut
from app.services.blob_service import upload_to_blob
from app.services.document_parser import parse_quote_document

router = APIRouter(prefix="/quotes", tags=["quotes"])


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

    quote_payload = payload.model_dump(exclude={"carrier_name"})
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
    for k, v in payload.model_dump(exclude={"carrier_name"}).items():
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
async def upload_quote_file(file: UploadFile = File(...)):
    """Upload a quote document (PDF, DOCX, XLSX), parse it, and return extracted data."""
    allowed = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload PDF, DOCX, or XLSX.")

    contents = await file.read()
    blob_url = upload_to_blob(file.filename, contents, file.content_type)
    extracted = await parse_quote_document(contents, file.filename, file.content_type)

    return FileUploadResult(
        filename=file.filename,
        blob_url=blob_url,
        extracted_data=extracted,
        message="File uploaded and parsed successfully.",
    )
