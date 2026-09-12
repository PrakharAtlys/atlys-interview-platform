import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CenterShell, Wordmark } from '../../components/Shell'
import { Panel, Button } from '../../components/ui'
import { api } from '../../lib/api'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin() {
    setError(null)
    setLoading(true)
    // Stop-gap auth for the MVP slice: a shared admin access token (see
    // apps/api ADMIN_TOKEN env var). Real per-user SSO/RBAC is a later phase —
    // for now the email is only used for audit-log attribution, the token is
    // what actually gates access.
    sessionStorage.setItem('adminEmail', email)
    sessionStorage.setItem('adminToken', token)
    try {
      await api.listSessions()
      navigate('/admin/dashboard')
    } catch {
      sessionStorage.removeItem('adminToken')
      setError('Invalid access token.')
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
        <h1 className="text-2xl font-semibold text-ink">Reviewer sign-in</h1>
        <p className="mt-2 text-sm text-ink-dim">Atlys team members only.</p>
        <div className="mt-6 space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@atlys.com"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-flux"
          />
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            type="password"
            placeholder="Admin access token"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 font-mono text-sm text-ink outline-none placeholder:text-ink-faint focus:border-flux"
          />
          {error && <p className="text-sm text-alert">{error}</p>}
          <Button className="w-full" disabled={!email.trim() || !token.trim() || loading} onClick={handleLogin}>
            {loading ? 'Verifying…' : 'Continue'}
          </Button>
        </div>
      </Panel>
    </CenterShell>
  )
}
