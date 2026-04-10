import type { CarrierQuote, GapFlag, Property, CellRating } from '../types'

const TODAY = new Date('2026-03-24')

export function detectGaps(quote: CarrierQuote, property: Property): GapFlag[] {
  const flags: GapFlag[] = []

  if (quote.valuationBasis === 'ACV') {
    flags.push({
      severity: 'error',
      attribute: 'Valuation',
      message: 'ACV valuation — building will be subject to depreciation at claim time. Replacement Cost strongly recommended.',
    })
  }

  if (quote.coverageForm !== 'Special') {
    flags.push({
      severity: 'warning',
      attribute: 'Coverage Form',
      message: `${quote.coverageForm} form provides narrower coverage than Special Form. Recommend upgrading.`,
    })
  }

  if (quote.floodLimit === null) {
    flags.push({
      severity: 'error',
      attribute: 'Flood',
      message: 'Flood excluded — NFIP or private flood policy required to close this gap.',
    })
  }

  if (quote.floodLimit !== null && quote.floodLimit < property.insuredValue * 0.05) {
    flags.push({
      severity: 'warning',
      attribute: 'Flood',
      message: 'Flood sublimit is less than 5% of insured value. Consider increasing.',
    })
  }

  if (quote.businessInterruptionLimit < property.insuredValue * 0.1) {
    flags.push({
      severity: 'warning',
      attribute: 'Business Income',
      message: 'BI limit is below 10% of insured value — may be insufficient for a full recovery period.',
    })
  }

  if (quote.coinsurance < 80) {
    flags.push({
      severity: 'warning',
      attribute: 'Coinsurance',
      message: `${quote.coinsurance}% coinsurance — verify insured value is accurate to avoid penalty.`,
    })
  }

  if (quote.windHailDeductiblePct > 3) {
    flags.push({
      severity: 'warning',
      attribute: 'Wind/Hail Deductible',
      message: `${quote.windHailDeductiblePct}% wind/hail deductible is above market standard of 2-3%.`,
    })
  }

  if (!quote.equipmentBreakdown) {
    flags.push({
      severity: 'warning',
      attribute: 'Equipment Breakdown',
      message: 'Equipment breakdown excluded — covers HVAC, elevators, boilers. Recommended for commercial properties.',
    })
  }

  const expiry = new Date(quote.expiryDate)
  const msPerDay = 1000 * 60 * 60 * 24
  const daysUntilExpiry = Math.floor((expiry.getTime() - TODAY.getTime()) / msPerDay)
  if (daysUntilExpiry <= 7) {
    flags.push({
      severity: 'warning',
      attribute: 'Quote Expiry',
      message: `Quote expires ${quote.expiryDate} — bind immediately or request extension.`,
    })
  }

  const rating = quote.amBestRating
  const hasB = rating.includes('B')
  if (hasB) {
    flags.push({
      severity: 'warning',
      attribute: 'Carrier Rating',
      message: `AM Best ${rating} — verify financial strength meets client requirements.`,
    })
  }

  return flags
}

export function getCellRating(
  attribute: string,
  quoteId: string,
  quotes: CarrierQuote[],
  property: Property
): CellRating {
  const quote = quotes.find((q) => q.id === quoteId)
  if (!quote) return 'neutral'

  switch (attribute) {
    case 'premium': {
      const premiums = quotes.map((q) => q.annualPremium)
      const lowest = Math.min(...premiums)
      const val = quote.annualPremium
      if (val === lowest) return 'best'
      if (val <= lowest * 1.1) return 'good'
      if (val > lowest * 1.2) return 'warning'
      return 'good'
    }
    case 'aopDeductible': {
      const vals = quotes.map((q) => q.aopDeductible)
      const lowest = Math.min(...vals)
      const val = quote.aopDeductible
      if (val === lowest) return 'best'
      if (val <= lowest * 1.5) return 'good'
      if (val > lowest * 2) return 'warning'
      return 'good'
    }
    case 'windHailDeductiblePct': {
      const vals = quotes.map((q) => q.windHailDeductiblePct)
      const lowest = Math.min(...vals)
      const val = quote.windHailDeductiblePct
      if (val > 3) return 'warning'
      if (val === lowest) return 'best'
      return 'good'
    }
    case 'floodLimit': {
      if (quote.floodLimit === null) return 'excluded'
      const vals = quotes.filter((q) => q.floodLimit !== null).map((q) => q.floodLimit as number)
      const highest = Math.max(...vals)
      if (quote.floodLimit === highest) return 'best'
      return 'good'
    }
    case 'valuationBasis':
      return quote.valuationBasis === 'RC' ? 'good' : 'gap'
    case 'coverageForm': {
      if (quote.coverageForm === 'Special') return 'good'
      if (quote.coverageForm === 'Broad') return 'warning'
      return 'gap'
    }
    case 'businessInterruptionLimit': {
      const vals = quotes.map((q) => q.businessInterruptionLimit)
      const highest = Math.max(...vals)
      const val = quote.businessInterruptionLimit
      if (val === highest) return 'best'
      if (val >= highest * 0.8) return 'good'
      if (val < property.insuredValue * 0.1) return 'warning'
      return 'good'
    }
    default:
      return 'neutral'
  }
}
