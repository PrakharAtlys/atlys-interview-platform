import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { WideShell, Wordmark } from '../../components/Shell'
import { Panel, Badge } from '../../components/ui'
import { api, type AdminSessionSummary } from '../../lib/api'

const statusTone: Record<AdminSessionSummary['status'], 'warn' | 'flux' | 'signal'> = {
  in_progress: 'warn',
  submitted: 'flux',
  reviewed: 'signal',
}

export default function AdminDashboardPage() {
  const [sessions, setSessions] = useState<AdminSessionSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .listSessions()
      .then((res) => setSessions(res.sessions))
      .finally(() => setLoading(false))
  }, [])

  return (
    <WideShell>
      <header className="mb-6 flex items-center justify-between">
        <Wordmark />
        <h1 className="text-lg font-semibold text-ink">Assessment sessions</h1>
      </header>

      <Panel className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-raised/50 text-xs uppercase tracking-wider text-ink-faint">
            <tr>
              <th className="px-5 py-3 font-medium">Candidate</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Flags</th>
              <th className="px-5 py-3 font-medium">Score</th>
              <th className="px-5 py-3 font-medium">Started</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-5 py-8 text-center text-ink-faint" colSpan={5}>
                  Loading sessions…
                </td>
              </tr>
            )}
            {!loading && sessions.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-ink-faint" colSpan={5}>
                  No sessions yet.
                </td>
              </tr>
            )}
            {sessions.map((s) => (
              <tr
                key={s.id}
                className="border-b border-border/60 last:border-0 hover:bg-white/[0.03] transition-colors"
              >
                <td className="px-5 py-3">
                  <Link to={`/admin/sessions/${s.id}`} className="text-ink hover:text-flux-bright">
                    <div className="font-medium">{s.candidateName}</div>
                    <div className="text-xs text-ink-faint">{s.candidateEmail}</div>
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <Badge tone={statusTone[s.status]}>{s.status.replace('_', ' ')}</Badge>
                </td>
                <td className="px-5 py-3">
                  {s.flagCount > 0 ? <Badge tone="alert">{s.flagCount}</Badge> : <span className="text-ink-faint">0</span>}
                </td>
                <td className="px-5 py-3 text-ink">{s.score ?? '—'}</td>
                <td className="px-5 py-3 text-ink-faint">
                  {s.startedAt ? new Date(s.startedAt).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </WideShell>
  )
}
