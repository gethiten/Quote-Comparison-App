import clsx from 'clsx'
import type { ReactNode } from 'react'

type ButtonVariant = 'primary' | 'danger' | 'success' | 'secondary'

interface ButtonProps {
  variant?: ButtonVariant
  onClick?: () => void
  children: ReactNode
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white',
  secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-800',
}

export default function Button({
  variant = 'primary',
  onClick,
  children,
  className,
  disabled = false,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </button>
  )
}
