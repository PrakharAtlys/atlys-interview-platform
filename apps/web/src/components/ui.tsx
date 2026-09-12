import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

export function Panel({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'glass rounded-2xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'signal'

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-flux text-white hover:bg-flux-bright shadow-[0_0_24px_-4px_var(--color-flux)] hover:shadow-[0_0_32px_-2px_var(--color-flux)]',
  ghost:
    'bg-transparent border border-border text-ink hover:border-border-hover hover:bg-white/5',
  danger: 'bg-alert text-white hover:brightness-110',
  signal: 'bg-signal text-void font-semibold hover:brightness-110',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  icon?: ReactNode
}

export function Button({ variant = 'primary', icon, className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium',
        'transition-all duration-200 ease-out active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none',
        variantStyles[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

export function Badge({
  tone = 'flux',
  children,
}: {
  tone?: 'flux' | 'signal' | 'alert' | 'warn'
  children: ReactNode
}) {
  const toneMap: Record<string, string> = {
    flux: 'bg-flux-dim text-flux-bright border-flux/30',
    signal: 'bg-signal-dim text-signal border-signal/30',
    alert: 'bg-alert-dim text-alert border-alert/30',
    warn: 'bg-warn-dim text-warn border-warn/30',
  }
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        toneMap[tone],
      )}
    >
      {children}
    </span>
  )
}

export function GlowDot({ tone = 'flux' }: { tone?: 'flux' | 'signal' | 'alert' | 'warn' }) {
  const colorMap: Record<string, string> = {
    flux: 'bg-flux',
    signal: 'bg-signal',
    alert: 'bg-alert',
    warn: 'bg-warn',
  }
  return <span className={clsx('h-2 w-2 rounded-full animate-pulse-glow', colorMap[tone])} />
}
