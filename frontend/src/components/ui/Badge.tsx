import clsx from 'clsx'

type BadgeVariant = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray'

interface BadgeProps {
  text: string
  variant?: BadgeVariant
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  gray: 'bg-slate-100 text-slate-700',
}

export default function Badge({ text, variant = 'gray', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {text}
    </span>
  )
}
