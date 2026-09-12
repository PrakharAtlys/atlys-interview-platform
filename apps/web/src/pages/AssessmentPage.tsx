import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { WideShell } from '../components/Shell'
import { Panel, Button, Badge } from '../components/ui'
import { Timer } from '../components/Timer'
import { ProctorAlerts } from '../components/ProctorAlerts'
import { useProctoring } from '../hooks/useProctoring'
import { useFacePresence } from '../hooks/useFacePresence'
import { api } from '../lib/api'

interface Challenge {
  id: string
  slug: string
  title: string
  description: string
}

export default function AssessmentPage() {
  const navigate = useNavigate()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [endsAt, setEndsAt] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set())
  const [flagCount, setFlagCount] = useState(0)

  const {
    fullscreen,
    tabHidden,
    screenShareActive,
    multiMonitor,
    requestFullscreen,
    logPaste,
    stopAllRecording,
  } = useProctoring(sessionId)
  const { status: faceStatus } = useFacePresence(sessionId)

  useEffect(() => {
    const id = sessionStorage.getItem('sessionId')
    if (!id) {
      navigate('/')
      return
    }
    setSessionId(id)
    api.startSession(id).then((res) => {
      setChallenges(res.challenges)
      setEndsAt(res.endsAt)
      setActiveId(res.challenges[0]?.id ?? null)
    })
  }, [navigate])

  useEffect(() => {
    // disable right-click on the assessment shell only — never inside challenge iframes
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-challenge-frame]')) e.preventDefault()
    }
    document.addEventListener('contextmenu', handler)
    return () => document.removeEventListener('contextmenu', handler)
  }, [])

  async function handleFinish() {
    if (!sessionId) return
    // Release the camera/mic/screen-share the moment the candidate submits —
    // no reason to keep the OS recording indicators lit while they read the
    // confirmation screen.
    stopAllRecording()
    await api.finishSession(sessionId)
    navigate('/submitted')
  }

  const activeIndex = challenges.findIndex((c) => c.id === activeId)
  const active = challenges[activeIndex]
  const isLastChallenge = activeIndex === challenges.length - 1

  function goToNext() {
    if (activeIndex < challenges.length - 1) {
      setActiveId(challenges[activeIndex + 1].id)
    }
  }

  return (
    <WideShell>
      <ProctorAlerts
        tabHidden={tabHidden}
        fullscreen={fullscreen}
        screenShareActive={screenShareActive}
        multiMonitor={multiMonitor}
        faceStatus={faceStatus}
        onFlag={() => setFlagCount((c) => c + 1)}
      />
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
            Assessment in progress
          </p>
          <h1 className="text-xl font-semibold text-ink">Atlys Proving Ground</h1>
        </div>
        <div className="flex items-center gap-3">
          {!fullscreen && (
            <Button variant="ghost" onClick={requestFullscreen}>
              Return to fullscreen
            </Button>
          )}
          {flagCount > 0 && (
            <span title="Every tab switch, fullscreen exit, or camera issue is logged here and reviewed by a human — it's informational, not an auto-fail.">
              <Badge tone={flagCount >= 3 ? 'alert' : 'warn'}>
                {flagCount} activity {flagCount === 1 ? 'flag' : 'flags'} logged
              </Badge>
            </span>
          )}
          {endsAt && <Timer endsAt={endsAt} />}
          <Button variant="ghost" onClick={handleFinish} title="Ends the assessment now, even with unanswered challenges">
            Finish early
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-[260px_1fr] gap-6">
        <Panel className="p-3 h-fit">
          <p className="px-2 pb-2 pt-1 font-mono text-xs uppercase tracking-widest text-ink-faint">
            Challenges
          </p>
          <div className="space-y-1">
            {challenges.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  c.id === activeId ? 'bg-flux-dim text-flux-bright' : 'text-ink-dim hover:bg-white/5 hover:text-ink'
                }`}
              >
                <span className="truncate">{i + 1}. {c.title}</span>
                {submittedIds.has(c.id) && <Badge tone="signal">Done</Badge>}
              </button>
            ))}
          </div>
        </Panel>

        <AnimatePresence mode="wait">
          {active && sessionId && (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ChallengeView
                challenge={active}
                sessionId={sessionId}
                isLastChallenge={isLastChallenge}
                onSubmitted={() => setSubmittedIds((s) => new Set(s).add(active.id))}
                onNext={goToNext}
                onFinish={handleFinish}
                logPaste={logPaste}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </WideShell>
  )
}

function ChallengeView({
  challenge,
  sessionId,
  isLastChallenge,
  onSubmitted,
  onNext,
  onFinish,
  logPaste,
}: {
  challenge: Challenge
  sessionId: string
  isLastChallenge: boolean
  onSubmitted: () => void
  onNext: () => void
  onFinish: () => void
  logPaste: (sessionId: string, field: string, len: number) => void
}) {
  const [answer, setAnswer] = useState('')
  const [evidence, setEvidence] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Reset per-challenge local state when the candidate navigates to a different one.
  useEffect(() => {
    setAnswer('')
    setEvidence('')
    setStatus('idle')
  }, [challenge.id])

  async function handleSaveAndAdvance() {
    setStatus('saving')
    await api.submitAnswer(sessionId, challenge.id, answer, evidence)
    setStatus('saved')
    onSubmitted()
    if (isLastChallenge) {
      onFinish()
    } else {
      onNext()
    }
  }

  return (
    <div className="grid gap-4">
      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-ink">{challenge.title}</h2>
        <p className="mt-1 text-sm text-ink-dim">{challenge.description}</p>
      </Panel>

      <Panel className="overflow-hidden">
        <div
          data-challenge-frame
          className="aspect-[16/9] w-full bg-black"
        >
          <iframe
            title={challenge.title}
            src={`/challenges/${challenge.slug}/index.html?sessionId=${encodeURIComponent(sessionId)}`}
            sandbox="allow-scripts allow-same-origin allow-forms"
            className="h-full w-full border-0"
          />
        </div>
      </Panel>

      <Panel className="p-5 space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-ink">Your answer</span>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onPaste={(e) => logPaste(sessionId, 'answer', e.clipboardData.getData('text').length)}
            rows={3}
            placeholder="What did you find?"
            className="mt-1.5 w-full rounded-xl border border-border bg-surface p-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-flux"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">How did you find it? (optional)</span>
          <textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            onPaste={(e) => logPaste(sessionId, 'evidence', e.clipboardData.getData('text').length)}
            rows={2}
            placeholder="e.g. checked the Network tab and saw..."
            className="mt-1.5 w-full rounded-xl border border-border bg-surface p-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-flux"
          />
        </label>
        <div className="flex items-center gap-3">
          <Button
            variant={isLastChallenge ? 'danger' : 'primary'}
            onClick={handleSaveAndAdvance}
            disabled={!answer.trim() || status === 'saving'}
          >
            {status === 'saving'
              ? 'Saving…'
              : isLastChallenge
                ? 'Save & finish assessment'
                : 'Save & next challenge →'}
          </Button>
          {!isLastChallenge && (
            <Button variant="ghost" onClick={onNext}>
              Skip for now →
            </Button>
          )}
          {status === 'saved' && <Badge tone="signal">Saved</Badge>}
        </div>
      </Panel>
    </div>
  )
}
