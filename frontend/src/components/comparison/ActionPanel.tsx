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
    setAiLoading(true)
    try {
      const result = await fetchAiAnalysis(comparison.id)
      setAiAnalysis(result.analysis)
    } catch {
      setAiAnalysis('AI analysis unavailable. Please configure Azure OpenAI credentials in the backend.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="border-t border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 flex-wrap">
        <Button variant="danger" onClick={() => alert('Gap flags are shown in the comparison grid above.')}>
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

      {/* AI Analysis Panel */}
      {aiAnalysis && (
        <div className="px-4 py-4 border-b border-slate-200 bg-blue-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-blue-800">AI Quote Analysis</h3>
            <button onClick={() => setAiAnalysis(null)} className="text-xs text-blue-600 hover:text-blue-800">Close</button>
          </div>
          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{aiAnalysis}</pre>
        </div>
      )}

      {showScoring && (
        <div className="px-4 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
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
            <div className="flex-1">
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
