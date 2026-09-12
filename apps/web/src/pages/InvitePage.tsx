import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CenterShell, Wordmark } from '../components/Shell'
import { Panel, Button } from '../components/ui'
import { api } from '../lib/api'

export default function InvitePage() {
  const [params] = useSearchParams()
  const [token, setToken] = useState(params.get('token') ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleRedeem() {
    setError(null)
    setLoading(true)
    try {
      const { session } = await api.redeemInvite(token.trim())
      sessionStorage.setItem('sessionId', session.id)
      sessionStorage.setItem('candidateName', session.candidateName)
      navigate('/precheck')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not redeem this invite.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <CenterShell>
      <div className="mb-8 flex justify-center">
        <Wordmark />
      </div>
      <Panel className="p-8">
        <h1 className="text-2xl font-semibold text-ink">Welcome to your assessment</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Enter the one-time code from your invite email to begin. This link is unique to you and
          expires after use.
        </p>
        <div className="mt-6 space-y-3">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Invite code, e.g. AXQ7-92FK"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 font-mono text-sm text-ink outline-none placeholder:text-ink-faint focus:border-flux"
          />
          {error && <p className="text-sm text-alert">{error}</p>}
          <Button
            className="w-full"
            disabled={!token.trim() || loading}
            onClick={handleRedeem}
          >
            {loading ? 'Verifying…' : 'Continue'}
          </Button>
        </div>
      </Panel>
      <p className="mt-6 text-center text-xs text-ink-faint">
        No public sign-up — access is invite-only. Trouble? Contact your Atlys recruiter contact.
      </p>
    </CenterShell>
  )
}
