import clsx from 'clsx'
import type { Page } from '../../App'

interface TopNavProps {
  page: Page
  onNavigate: (p: Page) => void
  onNewQuote?: () => void
}

const navLinks: { label: string; page: Page }[] = [
  { label: 'Dashboard', page: 'dashboard' },
  { label: 'Comparisons', page: 'comparison' },
]

export default function TopNav({ page, onNavigate, onNewQuote }: TopNavProps) {
  return (
    <header className="flex items-center justify-between px-6 py-0 h-14 bg-navy-dark border-b border-navy-light shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded bg-brand-blue flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="3" width="6" height="10" rx="1" fill="white" opacity="0.9" />
              <rect x="9" y="1" width="6" height="12" rx="1" fill="white" />
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-none">QuoteCompare Pro</div>
            <div className="text-blue-300 text-xs leading-none mt-0.5">Commercial Property</div>
          </div>
        </div>
      </div>
      <nav className="flex items-center gap-1">
        {navLinks.map(({ label, page: p }) => (
          <button
            key={p}
            onClick={() => onNavigate(p)}
            className={clsx(
              'px-4 py-4 text-sm font-medium transition-colors border-b-2',
              page === p
                ? 'text-white border-brand-blue'
                : 'text-slate-300 hover:text-white border-transparent hover:border-slate-500'
            )}
          >
            {label}
          </button>
        ))}
        <button className="px-4 py-4 text-sm font-medium text-slate-300 hover:text-white border-b-2 border-transparent hover:border-slate-500 transition-colors">
          Reports
        </button>
      </nav>
      <div className="flex items-center gap-3">
        <button onClick={onNewQuote} className="flex items-center gap-1.5 bg-brand-blue hover:bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 1v12M1 7h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Quote
        </button>
        <div className="w-8 h-8 rounded-full bg-brand-teal flex items-center justify-center text-white text-xs font-bold">
          SM
        </div>
      </div>
    </header>
  )
}
