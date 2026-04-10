from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


# ---------- Carrier ----------

class CarrierBase(BaseModel):
    carrier_name: str
    am_best_rating: str | None = None
    admitted_status: str | None = None
    is_active: bool = True


class CarrierCreate(CarrierBase):
    pass


class CarrierOut(CarrierBase):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)


# ---------- Property ----------

class PropertyBase(BaseModel):
    address: str
    city: str | None = None
    state: str | None = None
    zip: str | None = None
    type: str
    sub_type: str | None = None
    sq_footage: int | None = None
    year_built: int | None = None
    stories: int | None = None
    construction: str | None = None
    sprinklered: bool | None = None
    insured_value: float


class PropertyCreate(PropertyBase):
    account_id: uuid.UUID


class PropertyOut(PropertyBase):
    id: uuid.UUID
    account_id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)


# ---------- Quote ----------

class QuoteBase(BaseModel):
    carrier_name: str | None = None
    quote_number: str | None = None
    quote_date: str | None = None
    effective_date: str | None = None
    expiry_date: str | None = None
    building_limit: float | None = None
    valuation_basis: str | None = None
    coverage_form: str | None = None
    coinsurance: int | None = None
    bpp_limit: float | None = None
    business_interruption_limit: float | None = None
    bi_period_months: int | None = None
    gl_per_occurrence: float | None = None
    gl_aggregate: float | None = None
    aop_deductible: float | None = None
    wind_hail_deductible_pct: float | None = None
    flood_limit: float | None = None
    earthquake_limit: float | None = None
    equipment_breakdown: bool | None = None
    ordinance_or_law: bool | None = None
    annual_premium: float | None = None
    underwriting_notes: str | None = None
    raw_file_url: str | None = None
    source_filename: str | None = None


class QuoteCreate(QuoteBase):
    property_id: uuid.UUID
    carrier_id: uuid.UUID


class QuoteOut(QuoteBase):
    id: uuid.UUID
    property_id: uuid.UUID
    carrier_id: uuid.UUID
    carrier: CarrierOut | None = None
    created_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


# ---------- Account ----------

class AccountBase(BaseModel):
    client_name: str
    address: str | None = None


class AccountCreate(AccountBase):
    pass


class AccountOut(AccountBase):
    id: uuid.UUID
    created_at: datetime | None = None
    properties: list[PropertyOut] = []
    model_config = ConfigDict(from_attributes=True)


# ---------- Comparison ----------

class ScoreWeights(BaseModel):
    premium: int = 35
    coverage_breadth: int = 30
    carrier_rating: int = 20
    deductibles: int = 15


class ComparisonBase(BaseModel):
    client_name: str
    producer: str | None = None
    notes: str | None = None
    status: str = "active"


class ComparisonCreate(ComparisonBase):
    account_id: uuid.UUID
    quote_ids: list[uuid.UUID] = []
    score_weights: ScoreWeights | None = None


class ComparisonUpdate(BaseModel):
    notes: str | None = None
    recommended_quote_id: uuid.UUID | None = None
    score_weights: ScoreWeights | None = None
    status: str | None = None


class ComparisonOut(ComparisonBase):
    id: uuid.UUID
    account_id: uuid.UUID
    score_weight_premium: int = 35
    score_weight_coverage: int = 30
    score_weight_carrier_rating: int = 20
    score_weight_deductibles: int = 15
    recommended_quote_id: uuid.UUID | None = None
    quotes: list[QuoteOut] = []
    created_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


# ---------- Upload ----------

class FileUploadResult(BaseModel):
    filename: str
    blob_url: str
    extracted_data: QuoteBase | None = None
    message: str


# ---------- Scoring ----------

class GapFlag(BaseModel):
    severity: str  # error | warning | info
    attribute: str
    message: str


class ScoredQuote(BaseModel):
    quote: QuoteOut
    total_score: float
    breakdown: dict[str, float]
    gaps: list[GapFlag]
