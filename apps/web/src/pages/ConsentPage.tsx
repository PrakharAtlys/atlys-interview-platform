import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CenterShell, Wordmark } from '../components/Shell'
import { Panel, Button } from '../components/ui'
import { api } from '../lib/api'

const CONSENT_VERSION = '2026-09-v1'

export default function ConsentPage() {
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleAgree() {
    const sessionId = sessionStorage.getItem('sessionId')
    if (!sessionId) return
    setLoading(true)
    await api.recordConsent(sessionId, CONSENT_VERSION)
    setLoading(false)
    navigate('/instructions')
  }

  return (
    <CenterShell>
      <div className="mb-8 flex justify-center">
        <Wordmark />
      </div>
      <Panel className="p-8">
        <h1 className="text-2xl font-semibold text-ink">Recording & consent</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Please read carefully. Nothing is recorded until you accept below.
        </p>

        <div className="mt-5 space-y-3 text-sm text-ink-dim max-h-72 overflow-y-auto pr-2">
          <ConsentItem title="What we record">
            Your webcam video and audio for the full session, tab-visibility and window-focus
            events, fullscreen status, paste events on answer fields, and your submitted answers.
          </ConsentItem>
          <ConsentItem title="What we don't do">
            We do not silently record before you accept this screen, and we never block or
            disable browser DevTools — several challenges expect you to use them.
          </ConsentItem>
          <ConsentItem title="Storage & retention">
            Recordings are encrypted at rest and retained for up to 90 days after a hiring
            decision is made, after which they are automatically deleted. You may request early
            deletion of your data at any time.
          </ConsentItem>
          <ConsentItem title="Who can view this">
            Only authenticated Atlys hiring team members with a legitimate reviewing reason.
            Every view is logged in an audit trail.
          </ConsentItem>
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-4">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-flux"
          />
          <span className="text-sm text-ink">
            I have read and understood the above. I consent to webcam recording, activity
            logging, and data storage as described, version <code className="text-xs text-ink-dim">{CONSENT_VERSION}</code>.
          </span>
        </label>

        <Button className="mt-6 w-full" disabled={!agreed || loading} onClick={handleAgree}>
          {loading ? 'Recording consent…' : 'I agree — continue'}
        </Button>
      </Panel>
    </CenterShell>
  )
}

function ConsentItem({ title, children }: { title: string; children: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-surface/50 p-3">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1">{children}</p>
    </div>
  )
}
