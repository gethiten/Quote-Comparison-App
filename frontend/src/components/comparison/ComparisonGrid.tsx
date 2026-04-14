import { useState, Fragment } from 'react'
import clsx from 'clsx'
import type { Comparison, CarrierQuote, CellRating, GapFlag } from '../../types'
import { detectGaps, getCellRating } from '../../utils/gapDetection'
import { fmtCurrency, fmtPct, fmtSF, fmtDate, ratingColor } from '../../utils/formatters'

interface ComparisonGridProps {
  comparison: Comparison
}

type CellRatingStyle = { row: string; text: string }

function cellStyle(rating: CellRating): CellRatingStyle {
  switch (rating) {
    case 'best': return { row: 'bg-cell-green', text: 'text-cell-greenText' }
    case 'good': return { row: 'bg-green-50', text: 'text-green-800' }
    case 'warning': return { row: 'bg-cell-amber', text: 'text-cell-amberText' }
    case 'gap':
    case 'excluded': return { row: 'bg-cell-red', text: 'text-cell-redText' }
    default: return { row: 'bg-white', text: 'text-slate-700' }
  }
}

interface AttributeRow {
  key: string; label: string; ratingKey?: string
  render: (q: CarrierQuote, property: { insuredValue: number; sqFootage: number }) => React.ReactNode
}
interface AttributeGroup { group: string; rows: AttributeRow[] }

const TODAY = new Date('2026-03-24')

function isExpiringWithin7Days(expiryDate: string): boolean {
  const expiry = new Date(expiryDate)
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((expiry.getTime() - TODAY.getTime()) / msPerDay) <= 7
}

const ATTRIBUTE_GROUPS: AttributeGroup[] = [
  {
    group: 'CARRIER PROFILE',
    rows: [
      { key: 'amBestRating', label: 'AM Best Rating', render: (q) => <span className={clsx('px-2 py-0.5 rounded text-xs font-bold', ratingColor(q.amBestRating))}>{q.amBestRating}</span> },
      { key: 'admittedStatus', label: 'Admitted Status', render: (q) => <span className={clsx('text-xs font-medium', q.admittedStatus === 'Admitted' ? 'text-green-700' : 'text-amber-700')}>{q.admittedStatus}</span> },
      { key: 'quoteNumber', label: 'Quote Number', render: (q) => <span className="text-xs font-mono text-slate-600">{q.quoteNumber}</span> },
      { key: 'expiryDate', label: 'Quote Expires', render: (q) => { const e = isExpiringWithin7Days(q.expiryDate); return <span className={clsx('text-xs font-medium', e ? 'text-red-700 font-semibold' : 'text-slate-600')}>{fmtDate(q.expiryDate)}{e && <span className="ml-1 text-red-600 text-xs">⚠ Soon</span>}</span> } },
    ],
  },
  {
    group: 'PROPERTY COVERAGE',
    rows: [
      { key: 'valuationBasis', label: 'Valuation Basis', ratingKey: 'valuationBasis', render: (q) => <span className={clsx('text-xs font-semibold', q.valuationBasis === 'RC' ? 'text-green-700' : 'text-red-700')}>{q.valuationBasis === 'RC' ? 'Replacement Cost' : 'Actual Cash Value'}</span> },
      { key: 'coverageForm', label: 'Coverage Form', ratingKey: 'coverageForm', render: (q) => <span className={clsx('text-xs font-medium', q.coverageForm === 'Special' ? 'text-green-700' : q.coverageForm === 'Broad' ? 'text-amber-700' : 'text-red-700')}>{q.coverageForm} Form</span> },
      { key: 'buildingLimit', label: 'Building Limit', render: (q) => <span className="text-xs font-medium">{fmtCurrency(q.buildingLimit)}</span> },
      { key: 'coinsurance', label: 'Coinsurance', render: (q) => <span className={clsx('text-xs font-medium', q.coinsurance >= 90 ? 'text-green-700' : 'text-slate-600')}>{fmtPct(q.coinsurance)}</span> },
    ],
  },
  {
    group: 'CONTENTS & TIME ELEMENT',
    rows: [
      { key: 'bppLimit', label: 'Bus. Personal Property', render: (q) => <span className="text-xs">{fmtCurrency(q.bppLimit)}</span> },
      { key: 'businessInterruptionLimit', label: 'Business Interruption', ratingKey: 'businessInterruptionLimit', render: (q) => <span className="text-xs font-medium">{fmtCurrency(q.businessInterruptionLimit)}<span className="text-slate-500 font-normal"> / {q.biPeriodMonths} mo</span></span> },
      { key: 'glLimits', label: 'General Liability', render: (q) => <span className="text-xs">{fmtCurrency(q.glPerOccurrence)} / {fmtCurrency(q.glAggregate)}</span> },
    ],
  },
  {
    group: 'DEDUCTIBLES',
    rows: [
      { key: 'aopDeductible', label: 'Per Occurrence Ded.', ratingKey: 'aopDeductible', render: (q) => <span className="text-xs font-medium">{fmtCurrency(q.aopDeductible)}</span> },
      { key: 'windHailDeductiblePct', label: 'Wind/Hail Ded.', ratingKey: 'windHailDeductiblePct', render: (q) => <span className="text-xs font-medium">{fmtPct(q.windHailDeductiblePct)} TIV</span> },
      { key: 'floodLimit', label: 'Flood Coverage', ratingKey: 'floodLimit', render: (q) => q.floodLimit === null ? <span className="text-xs font-semibold text-red-700">EXCLUDED</span> : <span className="text-xs font-medium">{fmtCurrency(q.floodLimit)}</span> },
    ],
  },
  {
    group: 'ADDITIONAL',
    rows: [
      { key: 'equipmentBreakdown', label: 'Equipment Breakdown', render: (q) => q.equipmentBreakdown ? <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">Included</span> : <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded">Excluded</span> },
      { key: 'ordinanceOrLaw', label: 'Ordinance or Law', render: (q) => q.ordinanceOrLaw ? <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">Included</span> : <span className="text-xs text-slate-500">Not Included</span> },
    ],
  },
  {
    group: 'PRICING',
    rows: [
      { key: 'annualPremium', label: 'Annual Premium', ratingKey: 'premium', render: (q) => <span className="text-sm font-bold">{fmtCurrency(q.annualPremium)}</span> },
      { key: 'ratePerSF', label: 'Rate per SF', render: (q, p) => <span className="text-xs text-slate-600">{fmtSF(q.annualPremium, p.sqFootage)}</span> },
    ],
  },
]

interface GapPanelProps { gaps: GapFlag[]; isOpen: boolean; onToggle: () => void }

function GapPanel({ gaps, isOpen, onToggle }: GapPanelProps) {
  if (gaps.length === 0) return null
  return (
    <div className="border-t border-slate-200 mt-1">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 transition-colors">
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-xs font-bold">{gaps.length}</span>
          <span className="text-slate-600 font-medium">Gap Flags</span>
        </span>
        <span className="text-slate-400">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="px-3 py-2 flex flex-col gap-1.5 bg-white">
          {gaps.map((g, i) => (
            <div key={i} className={clsx('text-xs px-2 py-1.5 rounded border-l-2', g.severity === 'error' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-amber-50 border-amber-400 text-amber-800')}>
              <div className="font-semibold mb-0.5">{g.attribute}</div>
              <div>{g.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ComparisonGrid({ comparison }: ComparisonGridProps) {
  const { quotes, property } = comparison
  const [openGapPanels, setOpenGapPanels] = useState<Record<string, boolean>>({})
  const toggleGapPanel = (quoteId: string) => { setOpenGapPanels((prev) => ({ ...prev, [quoteId]: !prev[quoteId] })) }
  const allGaps = quotes.map((q) => detectGaps(q, property))

  if (quotes.length === 0) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h3 className="text-base font-semibold text-navy-dark">No carriers selected</h3>
          <p className="mt-2 text-sm text-slate-500">
            Use the carrier checkboxes in the left sidebar to show the quotes you want to compare.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="border-collapse min-w-full" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '180px', minWidth: '180px' }} />
          {quotes.map((q) => <col key={q.id} style={{ width: '200px', minWidth: '200px' }} />)}
        </colgroup>
        <thead>
          <tr>
            <th className="sticky left-0 z-20 bg-slate-700 text-white text-xs font-semibold px-3 py-3 text-left border-r border-slate-600">Attribute</th>
            {quotes.map((q, qi) => {
              const gaps = allGaps[qi]
              const errorCount = gaps.filter((g) => g.severity === 'error').length
              const warnCount = gaps.filter((g) => g.severity === 'warning').length
              return (
                <th key={q.id} className="bg-navy-dark text-white text-left px-3 py-2 border-r border-navy-light align-top">
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-bold">{q.carrierName}</span>
                    <div className="flex gap-1">
                      {errorCount > 0 && <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">{errorCount}</span>}
                      {warnCount > 0 && <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-white text-xs font-bold">{warnCount}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={clsx('text-xs px-1.5 py-0.5 rounded font-semibold', ratingColor(q.amBestRating))}>{q.amBestRating}</span>
                    <span className="text-xs text-slate-400">{q.admittedStatus}</span>
                  </div>
                  <div className="text-base font-bold text-white">{fmtCurrency(q.annualPremium)}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{fmtSF(q.annualPremium, property.sqFootage)}</div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {ATTRIBUTE_GROUPS.map((group) => (
            <Fragment key={group.group}>
              <tr>
                <td colSpan={quotes.length + 1} className="sticky left-0 bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider px-3 py-1.5 border-t border-b border-slate-300">
                  {group.group}
                </td>
              </tr>
              {group.rows.map((row) => (
                <tr key={row.key} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="sticky left-0 z-10 bg-white border-r border-slate-200 px-3 py-2 text-xs text-slate-600 font-medium whitespace-nowrap">{row.label}</td>
                  {quotes.map((q) => {
                    const rating: CellRating = row.ratingKey ? getCellRating(row.ratingKey, q.id, quotes, property) : 'neutral'
                    const { row: rowBg, text } = cellStyle(rating)
                    return (
                      <td key={q.id} className={clsx('px-3 py-2 border-r border-slate-100 align-middle', rowBg, text)}>
                        <div className="flex items-center justify-between gap-1">
                          <span>{row.render(q, property)}</span>
                          {rating === 'best' && <span className="text-xs text-green-700 font-bold shrink-0">★</span>}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
          <tr>
            <td colSpan={quotes.length + 1} className="sticky left-0 bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider px-3 py-1.5 border-t border-b border-slate-300">UNDERWRITING NOTES</td>
          </tr>
          <tr className="border-b border-slate-100">
            <td className="sticky left-0 z-10 bg-white border-r border-slate-200 px-3 py-2 text-xs text-slate-600 font-medium">Notes</td>
            {quotes.map((q) => (
              <td key={q.id} className="px-3 py-2 border-r border-slate-100 bg-white align-top">
                {q.underwritingNotes ? <p className="text-xs text-slate-600 italic leading-relaxed">{q.underwritingNotes}</p> : <span className="text-xs text-slate-400">—</span>}
              </td>
            ))}
          </tr>
          <tr>
            <td colSpan={quotes.length + 1} className="sticky left-0 bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider px-3 py-1.5 border-t border-b border-red-200">GAP FLAGS</td>
          </tr>
          <tr>
            <td className="sticky left-0 z-10 bg-white border-r border-slate-200 px-3 py-2 text-xs text-slate-500 font-medium align-top">Detected Issues</td>
            {quotes.map((q, qi) => {
              const gaps = allGaps[qi]
              const isOpen = openGapPanels[q.id] ?? false
              return (
                <td key={q.id} className="px-0 py-0 border-r border-slate-200 align-top bg-white">
                  <GapPanel gaps={gaps} isOpen={isOpen} onToggle={() => toggleGapPanel(q.id)} />
                  {gaps.length === 0 && <div className="px-3 py-2 text-xs text-green-600 font-medium">No gaps detected</div>}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
