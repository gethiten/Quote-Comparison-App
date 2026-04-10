export type PropertyType = 'office' | 'retail' | 'industrial' | 'mixed-use' | 'hospitality' | 'multi-family' | 'special-purpose'
export type ValuationBasis = 'RC' | 'ACV'
export type CoverageForm = 'Special' | 'Broad' | 'Basic'
export type AdmittedStatus = 'Admitted' | 'Non-Admitted'
export type GapSeverity = 'error' | 'warning' | 'info'
export type CellRating = 'best' | 'good' | 'warning' | 'gap' | 'neutral' | 'excluded'

export interface Property {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip: string
  type: PropertyType
  subType: string
  sqFootage: number
  yearBuilt: number
  stories?: number
  construction?: string
  sprinklered?: boolean
  insuredValue: number
}

export interface CarrierQuote {
  id: string
  carrierName: string
  amBestRating: string
  admittedStatus: AdmittedStatus
  quoteNumber: string
  quoteDate?: string
  effectiveDate?: string
  expiryDate: string
  buildingLimit: number
  valuationBasis: ValuationBasis
  coverageForm: CoverageForm
  coinsurance: number
  bppLimit: number
  businessInterruptionLimit: number
  biPeriodMonths: number
  glPerOccurrence: number
  glAggregate: number
  aopDeductible: number
  windHailDeductiblePct: number
  floodLimit: number | null
  earthquakeLimit: number | null
  equipmentBreakdown: boolean
  ordinanceOrLaw: boolean
  annualPremium: number
  underwritingNotes?: string
}

export interface GapFlag {
  severity: GapSeverity
  attribute: string
  message: string
}

export interface ScoredQuote {
  quote: CarrierQuote
  totalScore: number
  breakdown: Record<string, number>
  gaps: GapFlag[]
}

export interface ScoreWeights {
  premium: number
  coverageBreadth: number
  carrierRating: number
  deductibles: number
}

export interface Comparison {
  id: string
  clientName: string
  producer: string
  property: Property
  quotes: CarrierQuote[]
  notes: string
  recommendedQuoteId: string | null
  scoreWeights: ScoreWeights
  status: string
}

export interface Account {
  id: string
  clientName: string
  producer: string
  comparisons: Comparison[]
}
