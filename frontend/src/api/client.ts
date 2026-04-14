/**
 * API client for the Quote Comparison backend.
 * Proxied in dev via Vite config (/api → http://localhost:8000/api).
 */
import type { Comparison, CarrierQuote } from '../types'

type RequestOptions = RequestInit & {
  timeoutMs?: number
}

const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim()
const BASE = configuredBase ? configuredBase.replace(/\/$/, '') : '/api'
const REQUEST_TIMEOUT_MS = 8000
const AI_REQUEST_TIMEOUT_MS = 60000

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const data = await res.json()
      if (typeof data?.detail === 'string' && data.detail.trim()) {
        return data.detail
      }
    }

    const text = await res.text()
    if (text.trim()) {
      return text
    }
  } catch {
    // ignore parse errors and fall back below
  }

  return fallback
}

async function request<T>(url: string, opts?: RequestOptions): Promise<T> {
  const controller = new AbortController()
  const timeoutMs = opts?.timeoutMs ?? REQUEST_TIMEOUT_MS
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  const headers = new Headers(opts?.headers)
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  const hasBody = opts?.body !== undefined && opts?.body !== null
  const isFormData = typeof FormData !== 'undefined' && opts?.body instanceof FormData
  if (hasBody && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  try {
    const res = await fetch(`${BASE}${url}`, {
      ...opts,
      headers,
      signal: opts?.signal ?? controller.signal,
    })
    if (!res.ok) {
      const message = await readErrorMessage(res, `API ${res.status}`)
      throw new Error(message)
    }
    if (res.status === 204) return undefined as T
    return res.json()
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`)
    }
    if (error instanceof TypeError) {
      throw new Error('Network request failed. Please refresh and try again.')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

/* ---------- API response types (match backend schemas) ---------- */

interface ApiCarrier {
  id: string
  carrier_name: string
  am_best_rating: string | null
  admitted_status: string | null
  is_active: boolean
}

interface ApiQuote {
  id: string
  property_id: string
  carrier_id: string
  carrier: ApiCarrier | null
  quote_number: string | null
  quote_date: string | null
  effective_date: string | null
  expiry_date: string | null
  building_limit: number | null
  valuation_basis: string | null
  coverage_form: string | null
  coinsurance: number | null
  bpp_limit: number | null
  business_interruption_limit: number | null
  bi_period_months: number | null
  gl_per_occurrence: number | null
  gl_aggregate: number | null
  aop_deductible: number | null
  wind_hail_deductible_pct: number | null
  flood_limit: number | null
  earthquake_limit: number | null
  equipment_breakdown: boolean | null
  ordinance_or_law: boolean | null
  annual_premium: number | null
  underwriting_notes: string | null
  raw_file_url: string | null
  source_filename: string | null
}

interface ApiComparison {
  id: string
  account_id: string
  client_name: string
  producer: string | null
  notes: string | null
  status: string
  score_weight_premium: number
  score_weight_coverage: number
  score_weight_carrier_rating: number
  score_weight_deductibles: number
  recommended_quote_id: string | null
  quotes: ApiQuote[]
}

interface ApiProperty {
  id: string
  account_id: string
  address: string
  city: string
  state: string
  zip: string
  type: string
  sub_type: string | null
  sq_footage: number | null
  year_built: number | null
  stories: number | null
  construction: string | null
  sprinklered: boolean | null
  insured_value: number
}

interface ApiAccount {
  id: string
  client_name: string
  address: string | null
  properties: ApiProperty[]
}

/* ---------- Mapping helpers ---------- */

function mapQuote(q: ApiQuote): CarrierQuote {
  return {
    id: q.id,
    carrierName: q.carrier?.carrier_name ?? 'Unknown',
    amBestRating: q.carrier?.am_best_rating ?? 'NR',
    admittedStatus: (q.carrier?.admitted_status as 'Admitted' | 'Non-Admitted') ?? 'Admitted',
    quoteNumber: q.quote_number ?? '',
    quoteDate: q.quote_date ?? '',
    effectiveDate: q.effective_date ?? '',
    expiryDate: q.expiry_date ?? '',
    buildingLimit: q.building_limit ?? 0,
    valuationBasis: (q.valuation_basis as 'RC' | 'ACV') ?? 'RC',
    coverageForm: (q.coverage_form as 'Special' | 'Broad' | 'Basic') ?? 'Special',
    coinsurance: q.coinsurance ?? 80,
    bppLimit: q.bpp_limit ?? 0,
    businessInterruptionLimit: q.business_interruption_limit ?? 0,
    biPeriodMonths: q.bi_period_months ?? 12,
    glPerOccurrence: q.gl_per_occurrence ?? 0,
    glAggregate: q.gl_aggregate ?? 0,
    aopDeductible: q.aop_deductible ?? 0,
    windHailDeductiblePct: q.wind_hail_deductible_pct ?? 0,
    floodLimit: q.flood_limit,
    earthquakeLimit: q.earthquake_limit,
    equipmentBreakdown: q.equipment_breakdown ?? false,
    ordinanceOrLaw: q.ordinance_or_law ?? false,
    annualPremium: q.annual_premium ?? 0,
    underwritingNotes: q.underwriting_notes ?? undefined,
  }
}

/* ---------- Public API ---------- */

export async function fetchComparisons(): Promise<{
  comparisons: Comparison[]
  accounts: ApiAccount[]
}> {
  const [accountsResult, comparisonsResult] = await Promise.allSettled([
    request<ApiAccount[]>('/accounts'),
    request<ApiComparison[]>('/comparisons'),
  ])

  const accounts = accountsResult.status === 'fulfilled' ? accountsResult.value : []
  const apiComparisons = comparisonsResult.status === 'fulfilled' ? comparisonsResult.value : []

  // Build a property lookup from all accounts
  const propertyMap: Record<string, ApiProperty> = {}
  for (const acct of accounts) {
    for (const prop of acct.properties) {
      propertyMap[prop.id] = prop
    }
  }

  const comparisons: Comparison[] = apiComparisons.map((comp) => {
    const quotes = comp.quotes.map(mapQuote)

    let prop: ApiProperty | undefined
    if (comp.quotes.length > 0) {
      prop = propertyMap[comp.quotes[0].property_id]
    }

    return {
      id: comp.id,
      clientName: comp.client_name,
      producer: comp.producer ?? '',
      notes: comp.notes ?? '',
      recommendedQuoteId: comp.recommended_quote_id,
      scoreWeights: {
        premium: comp.score_weight_premium,
        coverageBreadth: comp.score_weight_coverage,
        carrierRating: comp.score_weight_carrier_rating,
        deductibles: comp.score_weight_deductibles,
      },
      property: {
        id: prop?.id ?? '',
        name: `${prop?.city ?? ''} ${prop?.type ?? 'Property'}`,
        address: prop?.address ?? '',
        city: prop?.city ?? '',
        state: prop?.state ?? '',
        zip: prop?.zip ?? '',
        type: (prop?.type ?? 'office') as Comparison['property']['type'],
        subType: prop?.sub_type ?? '',
        sqFootage: prop?.sq_footage ?? 0,
        yearBuilt: prop?.year_built ?? 0,
        stories: prop?.stories ?? undefined,
        construction: prop?.construction ?? undefined,
        sprinklered: prop?.sprinklered ?? undefined,
        insuredValue: prop?.insured_value ?? 0,
      },
      quotes,
      status: comp.status,
    }
  })

  return { comparisons, accounts }
}

export async function updateComparison(
  id: string,
  data: { notes?: string; recommended_quote_id?: string | null; score_weights?: { premium: number; coverage_breadth: number; carrier_rating: number; deductibles: number }; status?: string }
): Promise<void> {
  await request(`/comparisons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function uploadQuoteFile(file: File): Promise<{
  filename: string
  blob_url: string
  extracted_data: Record<string, unknown> | null
  message: string
}> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE}/quotes/upload`, { method: 'POST', body: formData })
  if (!res.ok) {
    const message = await readErrorMessage(res, `Upload failed: ${res.status}`)
    throw new Error(message)
  }
  return res.json()
}

export async function createAccount(data: {
  client_name: string
  address?: string
}): Promise<ApiAccount> {
  return request('/accounts', { method: 'POST', body: JSON.stringify(data) })
}

export async function createProperty(data: {
  account_id: string
  address: string
  city?: string
  state?: string
  zip?: string
  type: string
  sub_type?: string
  sq_footage?: number
  year_built?: number
  stories?: number
  construction?: string
  sprinklered?: boolean
  insured_value: number
}): Promise<ApiProperty> {
  return request('/properties', { method: 'POST', body: JSON.stringify(data) })
}

export async function createQuote(data: {
  property_id: string
  carrier_id: string
  quote_number?: string
  quote_date?: string
  effective_date?: string
  expiry_date?: string
  building_limit?: number
  valuation_basis?: string
  coverage_form?: string
  coinsurance?: number
  bpp_limit?: number
  business_interruption_limit?: number
  bi_period_months?: number
  gl_per_occurrence?: number
  gl_aggregate?: number
  aop_deductible?: number
  wind_hail_deductible_pct?: number
  flood_limit?: number | null
  earthquake_limit?: number | null
  equipment_breakdown?: boolean
  ordinance_or_law?: boolean
  annual_premium?: number
  underwriting_notes?: string
  raw_file_url?: string
  source_filename?: string
}): Promise<ApiQuote> {
  return request('/quotes', { method: 'POST', body: JSON.stringify(data) })
}

export async function createCarrier(data: {
  carrier_name: string
  am_best_rating?: string
  admitted_status?: string
}): Promise<ApiCarrier> {
  return request('/carriers', { method: 'POST', body: JSON.stringify(data) })
}

export async function fetchCarriers(): Promise<ApiCarrier[]> {
  return request('/carriers')
}

export async function fetchAiAnalysis(comparisonId: string): Promise<{ analysis: string }> {
  return request(`/ai/analyze/${comparisonId}`, { timeoutMs: AI_REQUEST_TIMEOUT_MS })
}
