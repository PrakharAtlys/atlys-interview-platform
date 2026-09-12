import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function CenterShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4 py-10">
      <ScanlineBackdrop />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-xl"
      >
        {children}
      </motion.div>
    </div>
  )
}

export function WideShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden px-4 py-8 md:px-8">
      <ScanlineBackdrop />
      <div className="relative z-10 mx-auto max-w-7xl">{children}</div>
    </div>
  )
}

function ScanlineBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.04]">
      <div className="absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-flux to-transparent animate-scan" />
    </div>
  )
}

export function Wordmark() {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-flux to-signal shadow-[0_0_20px_-2px_var(--color-flux)]" />
      <span className="font-mono text-sm tracking-widest text-ink-dim uppercase">
        Atlys <span className="text-ink">/ Proving Ground</span>
      </span>
    </div>
  )
}
