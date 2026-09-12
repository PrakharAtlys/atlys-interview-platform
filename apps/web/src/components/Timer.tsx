import { useEffect, useState } from 'react'
import clsx from 'clsx'

export function Timer({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState(() => new Date(endsAt).getTime() - Date.now())

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining(new Date(endsAt).getTime() - Date.now())
    }, 1000)
    return () => window.clearInterval(id)
  }, [endsAt])

  const clamped = Math.max(0, remaining)
  const mins = Math.floor(clamped / 60000)
  const secs = Math.floor((clamped % 60000) / 1000)
  const low = clamped < 5 * 60 * 1000

  return (
    <div
      className={clsx(
        'flex items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-sm tabular-nums',
        low ? 'border-alert/40 bg-alert-dim text-alert' : 'border-border bg-surface text-ink',
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', low ? 'bg-alert' : 'bg-signal', 'animate-pulse-glow')} />
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  )
}
