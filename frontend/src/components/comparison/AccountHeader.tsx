import type { Comparison } from '../../types'
import { fmtDate } from '../../utils/formatters'

interface AccountHeaderProps {
  comparison: Comparison
}

export default function AccountHeader({ comparison }: AccountHeaderProps) {
  const { property, clientName, producer } = comparison
  const formatNumber = (n: number) => new Intl.NumberFormat('en-US').format(n)

  return (
    <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-2">
      <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
        <span className="font-semibold text-slate-800">{clientName}</span>
        <Divider />
        <span>{property.address}, {property.city}, {property.state} {property.zip}</span>
        <Divider />
        <span className="capitalize font-medium text-indigo-700">{property.type}</span>
        <Divider />
        <span>{formatNumber(property.sqFootage)} SF</span>
        <Divider />
        <span>Built {property.yearBuilt}</span>
        <Divider />
        <span>Eff. {fmtDate(comparison.quotes[0]?.effectiveDate ?? '')}</span>
        <Divider />
        <span>Producer: <span className="font-medium text-slate-700">{producer}</span></span>
        <Divider />
        <span className="text-indigo-700 font-medium">{comparison.quotes.length} Quotes</span>
      </div>
    </div>
  )
}

function Divider() {
  return <span className="text-slate-300 select-none">|</span>
}
