import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CenterShell, Wordmark } from '../components/Shell'
import { Panel, Button } from '../components/ui'

const REDIRECT_SECONDS = 6

export default function SubmittedPage() {
  const navigate = useNavigate()
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS)

  useEffect(() => {
    // Clear the candidate's session so a stale id can't linger in this browser
    // once their attempt is over.
    sessionStorage.removeItem('sessionId')
    sessionStorage.removeItem('candidateName')

    const interval = window.setInterval(() => {
      setSecondsLeft((s) => s - 1)
    }, 1000)
    const timeout = window.setTimeout(() => navigate('/'), REDIRECT_SECONDS * 1000)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [navigate])

  return (
    <CenterShell>
      <div className="mb-8 flex justify-center">
        <Wordmark />
      </div>
      <Panel className="p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-signal-dim">
          <div className="h-3 w-3 rounded-full bg-signal animate-pulse-glow" />
        </div>
        <h1 className="text-2xl font-semibold text-ink">Submitted — thank you</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Your responses and recordings are uploading now. You'll hear back from the Atlys team
          soon. No score is shown here — a reviewer will evaluate your session.
        </p>
        <Button className="mt-6 w-full" onClick={() => navigate('/')}>
          Return to home now
        </Button>
        <p className="mt-3 text-xs text-ink-faint">
          Redirecting automatically in {secondsLeft}s…
        </p>
      </Panel>
    </CenterShell>
  )
}
