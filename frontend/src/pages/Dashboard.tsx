import type { Comparison } from '../types'
import Badge from '../components/ui/Badge'
import { fmtCurrency } from '../utils/formatters'

interface DashboardProps {
  comparisons: Comparison[]
  onSelectComparison: (index: number) => void
}

export default function Dashboard({ comparisons, onSelectComparison }: DashboardProps) {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-dark">Quote Comparisons</h1>
        <p className="text-slate-500 text-sm mt-1">Select a comparison to view details</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {comparisons.map((c, i) => {
          const lowestPremium = Math.min(...c.quotes.map((q) => q.annualPremium))
          const highestPremium = Math.max(...c.quotes.map((q) => q.annualPremium))
          return (
            <button
              key={c.id}
              onClick={() => onSelectComparison(i)}
              className="bg-white border border-slate-200 rounded-lg p-5 text-left hover:shadow-md hover:border-brand-blue transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-navy-dark group-hover:text-brand-blue transition-colors">{c.property.name}</h3>
                <Badge text={c.status} variant={c.status === 'Final' ? 'green' : c.status === 'In Review' ? 'blue' : 'gray'} />
              </div>
              <p className="text-xs text-slate-500 mb-2">{c.property.address}</p>
              <div className="flex items-center gap-2 text-xs text-slate-600 mb-3">
                <span className="bg-slate-100 px-2 py-0.5 rounded">{c.property.type}</span>
                <span>{c.property.sqFootage.toLocaleString()} SF</span>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{c.quotes.length} quotes</span>
                  <span className="text-slate-700 font-medium">
                    {fmtCurrency(lowestPremium)} – {fmtCurrency(highestPremium)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {c.quotes.map((q) => (
                    <span key={q.id} className="text-xs bg-navy-dark/5 text-navy-dark px-1.5 py-0.5 rounded">
                      {q.carrierName}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
