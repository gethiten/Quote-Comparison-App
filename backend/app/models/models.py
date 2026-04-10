import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _enum_values(enum_cls):
    return [member.value for member in enum_cls]


# ---------- ENUMS ----------

class UserRole(str, enum.Enum):
    producer = "producer"
    account_manager = "account_manager"
    team_lead = "team_lead"
    admin = "admin"


class PropertyType(str, enum.Enum):
    office = "office"
    retail = "retail"
    industrial = "industrial"
    mixed_use = "mixed-use"
    hospitality = "hospitality"
    multi_family = "multi-family"
    special_purpose = "special-purpose"


class ValuationBasis(str, enum.Enum):
    RC = "RC"
    ACV = "ACV"


class CoverageForm(str, enum.Enum):
    special = "Special"
    broad = "Broad"
    basic = "Basic"


class AdmittedStatus(str, enum.Enum):
    admitted = "Admitted"
    non_admitted = "Non-Admitted"


class ComparisonStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    archived = "archived"


# ---------- MODELS ----------

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column("user_id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    azure_oid: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True)
    email: Mapped[str] = mapped_column(String(256), unique=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, values_callable=_enum_values, native_enum=False),
        default=UserRole.producer,
    )
    team_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    accounts: Mapped[list["Account"]] = relationship(back_populates="created_by_user")


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column("account_id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_name: Mapped[str] = mapped_column(String(512), nullable=False)
    address: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    renewal_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    created_by_user: Mapped[User | None] = relationship(back_populates="accounts")
    properties: Mapped[list["Property"]] = relationship(back_populates="account", cascade="all, delete-orphan")
    comparisons: Mapped[list["Comparison"]] = relationship(back_populates="account", cascade="all, delete-orphan")


class Property(Base):
    __tablename__ = "properties"

    id: Mapped[uuid.UUID] = mapped_column("property_id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.account_id"), nullable=False)
    address: Mapped[str] = mapped_column(String(512), nullable=False)
    city: Mapped[str] = mapped_column(String(128), nullable=False)
    state: Mapped[str] = mapped_column(String(4), nullable=False)
    zip: Mapped[str] = mapped_column(String(16), nullable=False)
    type: Mapped[PropertyType] = mapped_column(
        Enum(PropertyType, values_callable=_enum_values, native_enum=False),
        nullable=False,
    )
    sub_type: Mapped[str | None] = mapped_column(String(256), nullable=True)
    sq_footage: Mapped[int | None] = mapped_column(Integer, nullable=True)
    year_built: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stories: Mapped[int | None] = mapped_column(Integer, nullable=True)
    construction: Mapped[str | None] = mapped_column(String(128), nullable=True)
    sprinklered: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    insured_value: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    account: Mapped[Account] = relationship(back_populates="properties")
    quotes: Mapped[list["Quote"]] = relationship(back_populates="property", cascade="all, delete-orphan")


class Carrier(Base):
    __tablename__ = "carriers"

    id: Mapped[uuid.UUID] = mapped_column("carrier_id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    carrier_name: Mapped[str] = mapped_column(String(256), unique=True, nullable=False)
    am_best_rating: Mapped[str | None] = mapped_column(String(8), nullable=True)
    admitted_status: Mapped[AdmittedStatus | None] = mapped_column(
        Enum(AdmittedStatus, values_callable=_enum_values, native_enum=False),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    quotes: Mapped[list["Quote"]] = relationship(back_populates="carrier")


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[uuid.UUID] = mapped_column("quote_id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.property_id"), nullable=False)
    carrier_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("carriers.carrier_id"), nullable=False)

    # Quote identification
    quote_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    quote_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    effective_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    expiry_date: Mapped[str | None] = mapped_column(String(32), nullable=True)

    # Coverage
    building_limit: Mapped[float | None] = mapped_column(Float, nullable=True)
    valuation_basis: Mapped[ValuationBasis | None] = mapped_column(
        Enum(ValuationBasis, values_callable=_enum_values, native_enum=False),
        nullable=True,
    )
    coverage_form: Mapped[CoverageForm | None] = mapped_column(
        Enum(CoverageForm, values_callable=_enum_values, native_enum=False),
        nullable=True,
    )
    coinsurance: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Contents & Time Element
    bpp_limit: Mapped[float | None] = mapped_column(Float, nullable=True)
    business_interruption_limit: Mapped[float | None] = mapped_column(Float, nullable=True)
    bi_period_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gl_per_occurrence: Mapped[float | None] = mapped_column(Float, nullable=True)
    gl_aggregate: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Deductibles
    aop_deductible: Mapped[float | None] = mapped_column(Float, nullable=True)
    wind_hail_deductible_pct: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Catastrophe
    flood_limit: Mapped[float | None] = mapped_column(Float, nullable=True)
    earthquake_limit: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Additional
    equipment_breakdown: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    ordinance_or_law: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # Pricing
    annual_premium: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Notes & file
    underwriting_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_file_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    source_filename: Mapped[str | None] = mapped_column(String(512), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    property: Mapped[Property] = relationship(back_populates="quotes")
    carrier: Mapped[Carrier] = relationship(back_populates="quotes")
    comparison_quotes: Mapped[list["ComparisonQuote"]] = relationship(back_populates="quote", cascade="all, delete-orphan")


class Comparison(Base):
    __tablename__ = "comparisons"

    id: Mapped[uuid.UUID] = mapped_column("comparison_id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("accounts.account_id"), nullable=False)
    client_name: Mapped[str] = mapped_column(String(512), nullable=False)
    producer: Mapped[str | None] = mapped_column(String(256), nullable=True)

    # Scoring
    score_weight_premium: Mapped[int] = mapped_column(Integer, default=35)
    score_weight_coverage: Mapped[int] = mapped_column(Integer, default=30)
    score_weight_carrier_rating: Mapped[int] = mapped_column(Integer, default=20)
    score_weight_deductibles: Mapped[int] = mapped_column(Integer, default=15)

    # Broker decisions
    recommended_quote_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("quotes.quote_id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ComparisonStatus] = mapped_column(
        Enum(ComparisonStatus, values_callable=_enum_values, native_enum=False),
        default=ComparisonStatus.active,
    )

    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    account: Mapped[Account] = relationship(back_populates="comparisons")
    comparison_quotes: Mapped[list["ComparisonQuote"]] = relationship(
        back_populates="comparison", cascade="all, delete-orphan"
    )


class ComparisonQuote(Base):
    __tablename__ = "comparison_quotes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    comparison_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("comparisons.comparison_id"), nullable=False)
    quote_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("quotes.quote_id"), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    comparison: Mapped[Comparison] = relationship(back_populates="comparison_quotes")
    quote: Mapped[Quote] = relationship(back_populates="comparison_quotes")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column("created_at", DateTime, default=datetime.utcnow)
