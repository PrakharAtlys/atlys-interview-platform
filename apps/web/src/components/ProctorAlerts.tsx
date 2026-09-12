import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import type { FaceStatus } from '../hooks/useFacePresence'

interface Toast {
  id: number
  tone: 'warn' | 'alert'
  message: string
  sticky?: boolean
}

interface ProctorAlertsProps {
  tabHidden: boolean
  fullscreen: boolean
  screenShareActive: boolean
  multiMonitor: boolean
  faceStatus: FaceStatus
  onFlag?: () => void
}

const FACE_MESSAGES: Partial<Record<FaceStatus, string>> = {
  no_face: "We can't see your face right now — please stay in frame.",
  multiple_faces: 'More than one face is visible — this session should be solo.',
  looking_away: 'You appear to be looking away from the screen for a while.',
}

let idCounter = 0

export function ProctorAlerts({
  tabHidden,
  fullscreen,
  screenShareActive,
  multiMonitor,
  faceStatus,
  onFlag,
}: ProctorAlertsProps) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const wasHiddenRef = useRef(false)
  const wasFullscreenRef = useRef(true)
  const lastFaceRef = useRef<FaceStatus>('ok')
  const flaggedStickyRef = useRef<Set<string>>(new Set())

  function pushToast(tone: Toast['tone'], message: string, opts?: { sticky?: boolean }) {
    const id = idCounter++
    setToasts((t) => [...t, { id, tone, message, sticky: opts?.sticky }])
    if (!opts?.sticky) {
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000)
    }
    onFlag?.()
    return id
  }

  // Tab switch — nothing to show while hidden (they can't see it), so we
  // surface a note the moment they come back instead.
  useEffect(() => {
    if (tabHidden) {
      wasHiddenRef.current = true
    } else if (wasHiddenRef.current) {
      wasHiddenRef.current = false
      pushToast('warn', 'Welcome back — that tab switch was logged for reviewer context.')
    }
  }, [tabHidden])

  // Fullscreen exit — gentle nudge, mirrors the "Return to fullscreen" header
  // button; only fires once per exit, not on every render while it's off.
  useEffect(() => {
    if (!fullscreen && wasFullscreenRef.current) {
      pushToast('warn', "You've left fullscreen — logged for review. Feel free to return when ready.")
    }
    wasFullscreenRef.current = fullscreen
  }, [fullscreen])

  // Face presence / head-pose — transient, clears itself once status returns to ok.
  useEffect(() => {
    if (faceStatus === 'ok' || faceStatus === 'initializing') {
      lastFaceRef.current = faceStatus === 'ok' ? 'ok' : lastFaceRef.current
      return
    }
    if (faceStatus !== lastFaceRef.current) {
      lastFaceRef.current = faceStatus
      const message = FACE_MESSAGES[faceStatus]
      if (message) pushToast('warn', message)
    }
  }, [faceStatus])

  const stickyWarnings: { key: string; tone: Toast['tone']; message: string }[] = []
  if (!screenShareActive) {
    stickyWarnings.push({
      key: 'screen-share',
      tone: 'alert',
      message: 'Screen sharing has stopped. Please re-share your screen to continue safely.',
    })
  }
  if (multiMonitor) {
    stickyWarnings.push({
      key: 'multi-monitor',
      tone: 'warn',
      message: 'A second display was detected and is noted for reviewer context.',
    })
  }

  // Sticky warnings render every frame from props rather than going through
  // pushToast, so they need their own one-shot dedupe to count as a flag once.
  useEffect(() => {
    for (const w of stickyWarnings) {
      if (!flaggedStickyRef.current.has(w.key)) {
        flaggedStickyRef.current.add(w.key)
        onFlag?.()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenShareActive, multiMonitor])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
      {stickyWarnings.map((w) => (
        <Bar key={w.key} tone={w.tone} message={w.message} />
      ))}
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="pointer-events-auto"
          >
            <Bar tone={t.tone} message={t.message} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function Bar({ tone, message }: { tone: 'warn' | 'alert'; message: string }) {
  return (
    <div
      className={clsx(
        'glass pointer-events-auto flex max-w-md items-center gap-2 rounded-full border px-4 py-2 text-xs shadow-lg',
        tone === 'alert' ? 'border-alert/40 text-alert' : 'border-warn/40 text-warn',
      )}
    >
      <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', tone === 'alert' ? 'bg-alert' : 'bg-warn')} />
      {message}
    </div>
  )
}
