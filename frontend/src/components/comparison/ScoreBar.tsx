import clsx from 'clsx'

interface ScoreBarProps {
  carrierName: string
  score: number
  rank: number
}

export default function ScoreBar({ carrierName, score, rank }: ScoreBarProps) {
  const isFirst = rank === 1
  const barColor = isFirst ? 'bg-green-500' : rank === 2 ? 'bg-blue-500' : 'bg-slate-400'
  const rankBadgeColor = isFirst
    ? 'bg-green-100 text-green-800 border-green-300'
    : rank === 2
    ? 'bg-blue-100 text-blue-800 border-blue-300'
    : 'bg-slate-100 text-slate-600 border-slate-300'

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border shrink-0', rankBadgeColor)}>
        {rank}
      </span>
      <span className="text-sm font-medium text-slate-700 w-24 shrink-0">{carrierName}</span>
      <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
        <div className={clsx('h-3 rounded-full transition-all duration-500', barColor)} style={{ width: `${score}%` }} />
      </div>
      <span className={clsx('text-sm font-bold w-10 text-right shrink-0', isFirst ? 'text-green-700' : 'text-slate-700')}>
        {score}
      </span>
    </div>
  )
}
