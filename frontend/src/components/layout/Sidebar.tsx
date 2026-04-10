import { useState } from 'react'
import clsx from 'clsx'
import type { Comparison } from '../../types'

interface SidebarProps {
  activeProperty: number
  onPropertySelect: (i: number) => void
  comparisons: Comparison[]
}

const navItems = [
  { label: 'Dashboard', icon: '⊞' },
  { label: 'My Accounts', icon: '◫' },
  { label: 'Comparisons', icon: '⊟', active: true },
  { label: 'Reports', icon: '▦' },
  { label: 'Templates', icon: '☰' },
]

const propertyTypeOptions = ['All Types', 'Office', 'Retail', 'Industrial', 'Mixed-Use']
const sortOptions = ['Premium', 'Score', 'Carrier Name']

export default function Sidebar({ activeProperty, onPropertySelect, comparisons }: SidebarProps) {
  const [propertyFilter, setPropertyFilter] = useState('All Types')
  const [sortBy, setSortBy] = useState('Premium')
  const [selectedCarriers, setSelectedCarriers] = useState<Record<string, boolean>>({
    Travelers: true, Zurich: true, Hartford: true, AIG: true, Chubb: true, CNA: true,
  })

  const toggleCarrier = (name: string) => {
    setSelectedCarriers((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  return (
    <aside className="w-[220px] shrink-0 bg-slate-100 border-r border-slate-200 flex flex-col h-full overflow-y-auto scrollbar-thin">
      <div className="p-3 border-b border-slate-200">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Navigation</p>
        <nav className="flex flex-col gap-0.5">
          {navItems.map(({ label, icon, active }) => (
            <button
              key={label}
              onClick={() => { if (label === 'Comparisons') onPropertySelect(activeProperty) }}
              className={clsx(
                'flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors w-full',
                active ? 'bg-blue-100 text-blue-800 font-medium' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-800'
              )}
            >
              <span className="text-base w-4 text-center">{icon}</span>
              {label}
            </button>
          ))}
        </nav>
      </div>
      <div className="p-3 border-b border-slate-200">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Properties</p>
        <div className="flex flex-col gap-0.5">
          {comparisons.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-slate-500">No properties loaded yet.</div>
          ) : (
            comparisons.map((comp, i) => (
              <button
                key={comp.id}
                onClick={() => onPropertySelect(i)}
                className={clsx(
                  'flex flex-col px-2 py-1.5 rounded text-left transition-colors w-full',
                  activeProperty === i ? 'bg-blue-100 text-blue-800' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                )}
              >
                <span className="text-xs font-medium capitalize">{comp.property.type}</span>
                <span className="text-xs text-slate-500 truncate">{comp.property.city}, {comp.property.state}</span>
              </button>
            ))
          )}
        </div>
      </div>
      <div className="p-3 border-b border-slate-200 flex-1">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Filters</p>
        <div className="mb-3">
          <label className="text-xs text-slate-600 block mb-1">Property Type</label>
          <select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-700">
            {propertyTypeOptions.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label className="text-xs text-slate-600 block mb-1">Carriers</label>
          <div className="flex flex-col gap-1">
            {Object.entries(selectedCarriers).map(([name, checked]) => (
              <label key={name} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input type="checkbox" checked={checked} onChange={() => toggleCarrier(name)} className="w-3 h-3 accent-blue-600" />
                {name}
              </label>
            ))}
          </div>
        </div>
        <div className="mb-3">
          <label className="text-xs text-slate-600 block mb-1">Sort By</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-700">
            {sortOptions.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <button className="w-full bg-brand-blue hover:bg-blue-600 text-white text-xs font-medium py-1.5 rounded transition-colors">
          Apply Filters
        </button>
      </div>
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brand-teal flex items-center justify-center text-white text-xs font-bold shrink-0">SM</div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-700 truncate">Sarah Mitchell</div>
            <div className="text-xs text-slate-500 truncate">Producer</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
