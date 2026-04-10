-- Schema based on Slide #17 Data Model + extended fields from the existing app
-- Target: Azure PostgreSQL Flexible Server

-- Uses gen_random_uuid() which is built-in to PostgreSQL 13+

-- Users
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    azure_oid VARCHAR(255) UNIQUE,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'producer'
        CHECK (role IN ('producer', 'account_manager', 'team_lead', 'admin')),
    team_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name VARCHAR(255) NOT NULL,
    address TEXT,
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    renewal_date DATE
);

-- Properties
CREATE TABLE IF NOT EXISTS properties (
    property_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'office',
    sub_type VARCHAR(100),
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    sq_footage INTEGER,
    year_built INTEGER,
    stories INTEGER,
    construction VARCHAR(100),
    sprinklered BOOLEAN,
    insured_value NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Carriers
CREATE TABLE IF NOT EXISTS carriers (
    carrier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_name VARCHAR(255) NOT NULL,
    am_best_rating VARCHAR(10),
    admitted_status VARCHAR(50) DEFAULT 'Admitted',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    template_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quotes
CREATE TABLE IF NOT EXISTS quotes (
    quote_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    carrier_id UUID NOT NULL REFERENCES carriers(carrier_id),
    quote_number VARCHAR(100),
    quote_date DATE,
    effective_date DATE,
    expiry_date DATE,
    building_limit NUMERIC(15,2),
    valuation_basis VARCHAR(10) CHECK (valuation_basis IN ('RC', 'ACV')),
    coverage_form VARCHAR(20) CHECK (coverage_form IN ('Special', 'Broad', 'Basic')),
    coinsurance INTEGER,
    bpp_limit NUMERIC(15,2),
    business_interruption_limit NUMERIC(15,2),
    bi_period_months INTEGER,
    gl_per_occurrence NUMERIC(15,2),
    gl_aggregate NUMERIC(15,2),
    aop_deductible NUMERIC(15,2),
    wind_hail_deductible_pct NUMERIC(5,2),
    flood_limit NUMERIC(15,2),
    earthquake_limit NUMERIC(15,2),
    equipment_breakdown BOOLEAN,
    ordinance_or_law BOOLEAN,
    annual_premium NUMERIC(15,2),
    underwriting_notes TEXT,
    raw_file_url TEXT,
    source_filename VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comparisons
CREATE TABLE IF NOT EXISTS comparisons (
    comparison_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    client_name VARCHAR(255),
    producer VARCHAR(255),
    created_by UUID REFERENCES users(user_id),
    score_weight_premium INTEGER NOT NULL DEFAULT 35,
    score_weight_coverage INTEGER NOT NULL DEFAULT 30,
    score_weight_carrier_rating INTEGER NOT NULL DEFAULT 20,
    score_weight_deductibles INTEGER NOT NULL DEFAULT 15,
    recommended_quote_id UUID REFERENCES quotes(quote_id),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comparison ↔ Quotes junction table
CREATE TABLE IF NOT EXISTS comparison_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comparison_id UUID NOT NULL REFERENCES comparisons(comparison_id) ON DELETE CASCADE,
    quote_id UUID NOT NULL REFERENCES quotes(quote_id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 0
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_properties_account ON properties(account_id);
CREATE INDEX IF NOT EXISTS idx_quotes_property ON quotes(property_id);
CREATE INDEX IF NOT EXISTS idx_quotes_carrier ON quotes(carrier_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_account ON comparisons(account_id);
CREATE INDEX IF NOT EXISTS idx_comparison_quotes_comparison ON comparison_quotes(comparison_id);
CREATE INDEX IF NOT EXISTS idx_comparison_quotes_quote ON comparison_quotes(quote_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

