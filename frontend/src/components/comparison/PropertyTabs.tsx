import clsx from 'clsx'
import type { Comparison } from '../../types'

interface PropertyTabsProps {
  comparisons: Comparison[]
  activeIndex: number
  onChangeTab: (i: number) => void
  onAddQuote?: () => void
}

const typeColors: Record<string, string> = {
  office: 'bg-blue-100 text-blue-700',
  retail: 'bg-orange-100 text-orange-700',
  industrial: 'bg-slate-200 text-slate-700',
  'mixed-use': 'bg-purple-100 text-purple-700',
  hospitality: 'bg-pink-100 text-pink-700',
  'multi-family': 'bg-green-100 text-green-700',
  'special-purpose': 'bg-red-100 text-red-700',
}

export default function PropertyTabs({ comparisons, activeIndex, onChangeTab, onAddQuote }: PropertyTabsProps) {
  return (
    <div className="flex items-end gap-0 border-b border-slate-200 bg-white px-4 overflow-x-auto scrollbar-thin">
      {comparisons.map((comp, i) => {
        const isActive = i === activeIndex
        const color = typeColors[comp.property.type] ?? 'bg-slate-100 text-slate-600'
        return (
          <button
            key={comp.id}
            onClick={() => onChangeTab(i)}
            className={clsx(
              'flex flex-col items-start px-4 py-2.5 border-b-2 text-left transition-colors shrink-0 min-w-[160px] max-w-[220px]',
              isActive ? 'border-blue-600 bg-blue-50' : 'border-transparent hover:bg-slate-50 hover:border-slate-300'
            )}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={clsx('text-xs font-semibold px-1.5 py-0.5 rounded capitalize', color)}>
                {comp.property.type}
              </span>
              <span className="text-xs text-slate-400">{comp.quotes.length} quotes</span>
            </div>
            <span className={clsx('text-xs font-medium truncate w-full', isActive ? 'text-blue-800' : 'text-slate-600')}>
              {comp.property.subType}
            </span>
            <span className="text-xs text-slate-400 truncate w-full">
              {comp.property.city}, {comp.property.state}
            </span>
          </button>
        )
      })}
      {onAddQuote && (
        <button
          onClick={onAddQuote}
          className="flex items-center gap-1 px-4 py-2.5 border-b-2 border-transparent text-sm font-medium text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors shrink-0"
        >
          <span className="text-lg leading-none">+</span> Add Quote
        </button>
      )}
    </div>
  )
}
