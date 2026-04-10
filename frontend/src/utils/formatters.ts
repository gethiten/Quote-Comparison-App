export const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export const fmtPct = (n: number) => `${n}%`

export const fmtSF = (premium: number, sqft: number) => `$${(premium / sqft).toFixed(2)}/SF`

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export const ratingColor = (r: string) =>
  r.startsWith('A++')
    ? 'text-green-700 bg-green-100'
    : r.startsWith('A+')
    ? 'text-green-700 bg-green-100'
    : r === 'A'
    ? 'text-blue-700 bg-blue-100'
    : r.includes('-')
    ? 'text-amber-700 bg-amber-100'
    : 'text-slate-700 bg-slate-100'
