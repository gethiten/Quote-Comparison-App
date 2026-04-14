import { useState } from 'react'
import type { Comparison, ScoreWeights } from '../../types'
import { rankQuotes } from '../../utils/scoring'
import { updateComparison, fetchAiAnalysis } from '../../api/client'
import Button from '../ui/Button'
import ScoreBar from './ScoreBar'

interface ActionPanelProps {
  comparison: Comparison
  onUpdate: (c: Comparison) => void
}

export default function ActionPanel({ comparison, onUpdate }: ActionPanelProps) {
  const [showScoring, setShowScoring] = useState(false)
  const [showAiOverlay, setShowAiOverlay] = useState(false)
  const [weights, setWeights] = useState<ScoreWeights>(comparison.scoreWeights)
  const [notes, setNotes] = useState(comparison.notes)
  const [recommendedId, setRecommendedId] = useState<string>(comparison.recommendedQuoteId ?? '')
  const [saved, setSaved] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const rankedQuotes = rankQuotes(comparison.quotes, comparison.property, weights)

  const handleWeightChange = (key: keyof ScoreWeights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }))
  }

  const totalWeight = weights.premium + weights.coverageBreadth + weights.carrierRating + weights.deductibles

  const formatCurrency = (value: number | null | undefined) => (
    typeof value === 'number'
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
      : '—'
  )

  const uniqueText = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)))

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const cleanAiText = (value: string) => value
    .replace(/\*\*/g, '')
    .replace(/^\s*[-•*]\s*/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim()

  const buildCarrierAliases = (carrierName: string) => {
    const aliases = new Set<string>()
    const normalized = carrierName.trim()
    if (!normalized) return []

    aliases.add(normalized)

    const compact = normalized
      .replace(/\b(the|insurance|property|casualty|fire|company|group|of|america|co|corp|corporation|inc|ltd|llc)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (compact) {
      aliases.add(compact)
    }

    compact
      .split(/\s+/)
      .filter((token) => token.length > 2)
      .forEach((token) => aliases.add(token))

    return Array.from(aliases)
  }

  const getInsightTone = (text: string) => {
    const normalized = text.toLowerCase()
    if (/(recommend|best|strong|broad|competitive|advantage|good value)/.test(normalized)) {
      return 'border-emerald-200 bg-emerald-50 text-emerald-800'
    }
    if (/(gap|exclude|concern|warning|higher|limited|deductible|coinsurance|risk)/.test(normalized)) {
      return 'border-amber-200 bg-amber-50 text-amber-800'
    }
    return 'border-blue-200 bg-blue-50 text-blue-800'
  }

  const analysisSections = (aiAnalysis ?? '')
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .flatMap((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
      if (lines.length > 1 && lines.every((line) => /^(\d+\.|[-•*])\s+/.test(line))) {
        return lines
      }
      return [block.trim()]
    })
    .filter(Boolean)

  const sentenceChunks = (aiAnalysis ?? '')
    .replace(/\r/g, '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  const recommendationMatch = (aiAnalysis ?? '').match(/\*\*5\.\s*Recommendation\*\*([\s\S]*?)(?:\*\*6\.|\*\*Summary Table\*\*|$)/i)
  const recommendationText = cleanAiText(recommendationMatch?.[1] ?? '')

  const aiRecommendedQuote = recommendationText
    ? comparison.quotes
        .map((quote) => {
          const firstMention = buildCarrierAliases(quote.carrierName)
            .map((alias) => recommendationText.search(new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i')))
            .filter((index) => index >= 0)
            .sort((a, b) => a - b)[0]

          return { quote, firstMention: firstMention ?? Number.POSITIVE_INFINITY }
        })
        .filter((item) => Number.isFinite(item.firstMention))
        .sort((a, b) => a.firstMention - b.firstMention)[0]?.quote
    : undefined

  const aiRecommendedScore = aiRecommendedQuote
    ? rankedQuotes.find((item) => item.quote.id === aiRecommendedQuote.id)?.totalScore ?? 0
    : null

  const carrierAnalysisRows = comparison.quotes.map((quote) => {
    const aliases = buildCarrierAliases(quote.carrierName)
    const matchesCarrier = (text: string) => aliases.some((alias) => new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i').test(text))
    const relatedSections = uniqueText(analysisSections.filter((section) => matchesCarrier(section)))
    const relatedSentences = uniqueText(sentenceChunks.filter((sentence) => matchesCarrier(sentence)))
    const ranked = rankedQuotes.find((item) => item.quote.id === quote.id)
    const isRecommendedByText = aliases.some((alias) => new RegExp(
      `recommend(?:ed)?[^.\\n]*\\b${escapeRegExp(alias)}\\b|\\b${escapeRegExp(alias)}\\b[^.\\n]*recommend(?:ed)?`,
      'i'
    ).test(aiAnalysis ?? ''))

    return {
      quote,
      score: ranked?.totalScore ?? 0,
      isRecommended: comparison.recommendedQuoteId === quote.id || isRecommendedByText,
      insights: relatedSections.length > 0
        ? relatedSections
        : relatedSentences.length > 0
          ? relatedSentences
          : ['AI did not mention this carrier separately, so review the full narrative below.'],
    }
  })

  const handleSaveRecommendation = async () => {
    onUpdate({
      ...comparison,
      notes,
      recommendedQuoteId: recommendedId || null,
      scoreWeights: weights,
    })
    try {
      await updateComparison(comparison.id, {
        notes,
        recommended_quote_id: recommendedId || null,
        score_weights: {
          premium: weights.premium,
          coverage_breadth: weights.coverageBreadth,
          carrier_rating: weights.carrierRating,
          deductibles: weights.deductibles,
        },
      })
    } catch {
      // Backend may be unavailable — local state already updated
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAiAnalysis = async () => {
    setShowAiOverlay(true)
    setAiAnalysis(null)
    setAiLoading(true)
    try {
      const result = await fetchAiAnalysis(comparison.id)
      setAiAnalysis(result.analysis)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI analysis is temporarily unavailable.'
      setAiAnalysis(message)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="border-t border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 flex-wrap">
        <Button variant="danger" onClick={() => alert('Gap flags are shown in the comparison grid.')}>
          <span className="text-xs">⚑</span> Flag Gaps
        </Button>
        <Button
          variant="secondary"
          onClick={() => setShowScoring((v) => !v)}
          className={showScoring ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' : ''}
        >
          <span className="text-xs">★</span> Score Quotes
        </Button>
        <Button variant="success" onClick={handleAiAnalysis} disabled={aiLoading}>
          <span className="text-xs">🤖</span> {aiLoading ? 'Analyzing...' : 'AI Analysis'}
        </Button>
        <Button variant="primary" onClick={() => navigator.clipboard?.writeText(window.location.href).catch(() => {})}>
          <span className="text-xs">⌗</span> Share
        </Button>
        {comparison.recommendedQuoteId && (
          <div className="ml-auto flex items-center gap-2 text-sm text-slate-600">
            <span className="text-xs text-slate-400">Recommended:</span>
            <span className="font-semibold text-green-700">
              {comparison.quotes.find((q) => q.id === comparison.recommendedQuoteId)?.carrierName ?? '—'}
            </span>
          </div>
        )}
      </div>

      {!aiLoading && aiRecommendedQuote && recommendationText && (
        <div className="mx-4 mt-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Best Carrier Recommended by AI</div>
              <div className="text-2xl font-semibold text-slate-900">{aiRecommendedQuote.carrierName}</div>
              <p className="max-w-3xl text-sm leading-6 text-slate-700">{recommendationText}</p>
            </div>
            <div className="flex min-w-[220px] flex-col gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Premium</span>
                <span className="font-semibold text-slate-900">{formatCurrency(aiRecommendedQuote.annualPremium)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Score</span>
                <span className="font-semibold text-purple-700">{aiRecommendedScore ?? 0}/100</span>
              </div>
              <Button variant="secondary" onClick={() => setShowAiOverlay(true)}>
                View AI Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAiOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 text-white">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">AI Quote Analysis</h3>
                <p className="text-sm text-blue-50 mt-1">Smart summary, recommendation highlights, and notable coverage observations.</p>
              </div>
              <button
                onClick={() => setShowAiOverlay(false)}
                className="text-white/80 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-5 bg-slate-50 overflow-y-auto max-h-[calc(90vh-140px)]">
              {aiLoading ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
                  <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                  <div className="text-base font-semibold text-slate-800">Generating analysis...</div>
                  <div className="text-sm text-slate-500 mt-1">The AI is reviewing the quotes and preparing insights.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                      <div className="text-sm font-semibold text-slate-800">Carrier-by-Carrier AI View</div>
                      <div className="text-xs text-slate-500 mt-1">Each row highlights premium, rating, score, and the full carrier-related AI observations.</div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold">Carrier</th>
                            <th className="px-4 py-3 text-left font-semibold">Premium</th>
                            <th className="px-4 py-3 text-left font-semibold">AM Best</th>
                            <th className="px-4 py-3 text-left font-semibold">Score</th>
                            <th className="px-4 py-3 text-left font-semibold">AI Highlights</th>
                          </tr>
                        </thead>
                        <tbody>
                          {carrierAnalysisRows.map(({ quote, score, isRecommended, insights }) => (
                            <tr key={quote.id} className="border-t border-slate-200 align-top">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-900">{quote.carrierName}</div>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {isRecommended && (
                                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                      Recommended
                                    </span>
                                  )}
                                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                    {quote.admittedStatus}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-700">{formatCurrency(quote.annualPremium)}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                  {quote.amBestRating}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                                  {score}/100
                                </span>
                              </td>
                              <td className="px-4 py-3 min-w-[360px]">
                                <div className="space-y-2">
                                  {insights.map((point, index) => (
                                    <div key={`${quote.id}-${index}`} className={`rounded-lg border px-3 py-2 text-[13px] leading-6 ${getInsightTone(point)}`}>
                                      {point}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-semibold text-slate-800 mb-2">Complete AI Narrative</div>
                    <div className="text-xs text-slate-500 mb-3">This preserves the full AI response so no detail is hidden by the table layout.</div>
                    <div className="space-y-3">
                      {analysisSections.map((section, index) => (
                        <div key={`full-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="font-serif text-[15px] leading-7 text-slate-800">{section}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 flex justify-end border-t border-slate-200 bg-white">
              <Button variant="secondary" onClick={() => setShowAiOverlay(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {showScoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-semibold text-navy-dark">Quote Scoring</h3>
                <p className="text-xs text-slate-500 mt-1">Compare ranking results and adjust scoring weights.</p>
              </div>
              <button
                onClick={() => setShowScoring(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-5 bg-slate-50 border-b border-slate-200">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 bg-white rounded-lg border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Scoring Weights</h3>
                  {totalWeight !== 100 && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-3">
                      Weights total {totalWeight}% — adjust to reach 100%.
                    </div>
                  )}
                  <div className="flex flex-col gap-3">
                    {([
                      { key: 'premium' as const, label: 'Premium' },
                      { key: 'coverageBreadth' as const, label: 'Coverage Breadth' },
                      { key: 'carrierRating' as const, label: 'Carrier Rating' },
                      { key: 'deductibles' as const, label: 'Deductibles' },
                    ]).map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-3">
                        <label className="text-xs text-slate-600 w-32 shrink-0">{label}</label>
                        <input type="range" min={0} max={100} step={5} value={weights[key]}
                          onChange={(e) => handleWeightChange(key, Number(e.target.value))}
                          className="flex-1 accent-blue-600" />
                        <span className="text-xs font-semibold text-slate-700 w-8 text-right">{weights[key]}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 bg-white rounded-lg border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Rankings</h3>
                  <div className="flex flex-col gap-0.5">
                    {rankedQuotes.map((sq, i) => (
                      <ScoreBar key={sq.quote.id} carrierName={sq.quote.carrierName} score={sq.totalScore} rank={i + 1} />
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    Scores incorporate gap penalties: −5pts per critical gap, −2pts per warning.
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 flex justify-end border-t border-slate-200 bg-white">
              <Button variant="secondary" onClick={() => setShowScoring(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-4 flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Broker Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="Add internal notes for this comparison (visible to team only)…"
            className="w-full text-xs border border-slate-300 rounded px-3 py-2 text-slate-700 placeholder-slate-400 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400" />
        </div>
        <div className="lg:w-72 shrink-0">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Broker Recommendation</label>
          <select value={recommendedId} onChange={(e) => setRecommendedId(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded px-3 py-2 text-slate-700 mb-2 focus:outline-none focus:ring-1 focus:ring-blue-400">
            <option value="">— Select Carrier —</option>
            {comparison.quotes.map((q) => <option key={q.id} value={q.id}>{q.carrierName}</option>)}
          </select>
          <Button variant="primary" onClick={handleSaveRecommendation} className="w-full justify-center">
            {saved ? '✓ Saved' : 'Save Recommendation'}
          </Button>
          {comparison.recommendedQuoteId && (
            <p className="text-xs text-green-700 mt-1.5">
              Current: <span className="font-semibold">
                {comparison.quotes.find((q) => q.id === comparison.recommendedQuoteId)?.carrierName}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
