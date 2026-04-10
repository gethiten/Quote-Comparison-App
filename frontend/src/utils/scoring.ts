import type { CarrierQuote, Property, ScoreWeights, ScoredQuote } from '../types'
import { detectGaps } from './gapDetection'

function ratingScore(amBest: string): number {
  if (amBest.startsWith('A++')) return 100
  if (amBest.startsWith('A+')) return 95
  if (amBest === 'A') return 85
  if (amBest.startsWith('A-')) return 70
  if (amBest.startsWith('B+')) return 55
  if (amBest.startsWith('B')) return 40
  return 30
}

function normalizeLower(value: number, values: number[]): number {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return 100
  return Math.round(((max - value) / (max - min)) * 100)
}

function coverageBreadthScore(quote: CarrierQuote, allQuotes: CarrierQuote[]): number {
  let score = 0
  if (quote.floodLimit !== null) {
    const floodVals = allQuotes.filter((q) => q.floodLimit !== null).map((q) => q.floodLimit as number)
    const maxFlood = Math.max(...floodVals)
    score += Math.round((quote.floodLimit / maxFlood) * 25)
  }
  if (quote.equipmentBreakdown) score += 20
  if (quote.ordinanceOrLaw) score += 15
  const biVals = allQuotes.map((q) => q.businessInterruptionLimit)
  const maxBI = Math.max(...biVals)
  score += Math.round((quote.businessInterruptionLimit / maxBI) * 25)
  if (quote.valuationBasis === 'RC') score += 10
  if (quote.coverageForm === 'Special') score += 5
  return Math.min(score, 100)
}

function deductiblesScore(quote: CarrierQuote, allQuotes: CarrierQuote[]): number {
  const aopVals = allQuotes.map((q) => q.aopDeductible)
  const windVals = allQuotes.map((q) => q.windHailDeductiblePct)
  const aopScore = normalizeLower(quote.aopDeductible, aopVals)
  const windScore = normalizeLower(quote.windHailDeductiblePct, windVals)
  return Math.round(aopScore * 0.6 + windScore * 0.4)
}

export function scoreQuote(
  quote: CarrierQuote,
  property: Property,
  allQuotes: CarrierQuote[],
  weights: ScoreWeights
): ScoredQuote {
  const premiumVals = allQuotes.map((q) => q.annualPremium)
  const premiumScore = normalizeLower(quote.annualPremium, premiumVals)
  const coverageScore = coverageBreadthScore(quote, allQuotes)
  const carrierScore = ratingScore(quote.amBestRating)
  const deductScore = deductiblesScore(quote, allQuotes)
  const totalWeight = weights.premium + weights.coverageBreadth + weights.carrierRating + weights.deductibles
  const totalScore = Math.round(
    (premiumScore * weights.premium +
      coverageScore * weights.coverageBreadth +
      carrierScore * weights.carrierRating +
      deductScore * weights.deductibles) /
      totalWeight
  )
  const breakdown: Record<string, number> = {
    premium: premiumScore,
    coverageBreadth: coverageScore,
    carrierRating: carrierScore,
    deductibles: deductScore,
  }
  const gaps = detectGaps(quote, property)
  const gapPenalty = gaps.filter((g) => g.severity === 'error').length * 5 +
    gaps.filter((g) => g.severity === 'warning').length * 2
  return {
    quote,
    totalScore: Math.max(0, Math.min(100, totalScore - gapPenalty)),
    breakdown,
    gaps,
  }
}

export function rankQuotes(
  quotes: CarrierQuote[],
  property: Property,
  weights: ScoreWeights
): ScoredQuote[] {
  const scored = quotes.map((q) => scoreQuote(q, property, quotes, weights))
  return scored.sort((a, b) => b.totalScore - a.totalScore)
}
