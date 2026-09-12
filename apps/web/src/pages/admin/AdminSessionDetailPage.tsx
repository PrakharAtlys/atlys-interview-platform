import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { WideShell, Wordmark } from '../../components/Shell'
import { Panel, Badge, Button } from '../../components/ui'
import { api, type AdminSessionDetail } from '../../lib/api'

export default function AdminSessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [detail, setDetail] = useState<AdminSessionDetail | null>(null)

  useEffect(() => {
    if (id) api.getSession(id).then(setDetail)
  }, [id])

  if (!detail) {
    return (
      <WideShell>
        <p className="text-ink-faint">Loading session…</p>
      </WideShell>
    )
  }

  return (
    <WideShell>
      <header className="mb-6 flex items-center justify-between">
        <Wordmark />
        <div className="text-right">
          <h1 className="text-lg font-semibold text-ink">{detail.candidateName}</h1>
          <p className="text-xs text-ink-faint">{detail.candidateEmail}</p>
        </div>
      </header>

      <div className="grid grid-cols-[1.4fr_1fr] gap-6">
        <div className="space-y-4">
          <RecordingPlayer webcamUrl={detail.webcamUrl} screenUrl={detail.screenUrl} />

          <Panel className="p-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-faint">
              Flag timeline
            </p>
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {detail.events.length === 0 && (
                <p className="text-sm text-ink-faint">No flagged events logged.</p>
              )}
              {detail.events.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel className="p-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-faint">
              Per-challenge review
            </p>
            <div className="space-y-3">
              {detail.submissions.map((s) => (
                <SubmissionCard key={s.id} submission={s} />
              ))}
              {detail.submissions.length === 0 && (
                <p className="text-sm text-ink-faint">No answers submitted yet.</p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </WideShell>
  )
}

function RecordingPlayer({
  webcamUrl,
  screenUrl,
}: {
  webcamUrl: string | null
  screenUrl: string | null
}) {
  const [tab, setTab] = useState<'webcam' | 'screen'>(webcamUrl ? 'webcam' : 'screen')
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const activeUrl = tab === 'webcam' ? webcamUrl : screenUrl

  useEffect(() => {
    let revoked: string | null = null
    if (!activeUrl) {
      setBlobUrl(null)
      return
    }
    setLoading(true)
    api.getRecordingBlobUrl(activeUrl).then((url) => {
      setBlobUrl(url)
      revoked = url
      setLoading(false)
    })
    return () => {
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [activeUrl])

  return (
    <Panel className="overflow-hidden">
      <div className="flex border-b border-border">
        <TabButton active={tab === 'webcam'} disabled={!webcamUrl} onClick={() => setTab('webcam')}>
          Candidate video
        </TabButton>
        <TabButton active={tab === 'screen'} disabled={!screenUrl} onClick={() => setTab('screen')}>
          Screen share
        </TabButton>
      </div>
      <div className="aspect-video bg-black flex items-center justify-center">
        {loading && <span className="text-sm text-ink-faint">Loading recording…</span>}
        {!loading && blobUrl && (
          <video key={blobUrl} src={blobUrl} controls className="h-full w-full" />
        )}
        {!loading && !blobUrl && (
          <span className="text-sm text-ink-faint">
            No {tab === 'webcam' ? 'candidate video' : 'screen share'} recording available
          </span>
        )}
      </div>
    </Panel>
  )
}

function TabButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  disabled: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 px-4 py-2.5 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active ? 'bg-flux-dim text-flux-bright' : 'text-ink-dim hover:bg-white/5 hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function EventRow({ event }: { event: AdminSessionDetail['events'][number] }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let revoked: string | null = null
    if (event.screenshotUrl) {
      api.getScreenshotBlobUrl(event.screenshotUrl).then((url) => {
        setThumbUrl(url)
        revoked = url
      })
    }
    return () => {
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [event.screenshotUrl])

  return (
    <div className="rounded-lg border border-border/60 bg-surface px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-ink">{formatEventType(event.type)}</span>
        <div className="flex items-center gap-2">
          {thumbUrl && (
            <button onClick={() => setExpanded((v) => !v)}>
              <img src={thumbUrl} alt="Flag screenshot" className="h-8 w-12 rounded object-cover border border-border" />
            </button>
          )}
          <span className="font-mono text-xs text-ink-faint whitespace-nowrap">
            {new Date(event.occurredAt).toLocaleTimeString()}
          </span>
        </div>
      </div>
      {expanded && thumbUrl && (
        <img src={thumbUrl} alt="Flag screenshot enlarged" className="mt-2 w-full rounded-lg border border-border" />
      )}
    </div>
  )
}

function formatEventType(type: string) {
  return type.replaceAll('_', ' ')
}

function SubmissionCard({ submission }: { submission: AdminSessionDetail['submissions'][number] }) {
  const [notes, setNotes] = useState(submission.reviewerNotes ?? '')
  const [verdict, setVerdict] = useState(submission.reviewerVerdict ?? '')
  const [saving, setSaving] = useState(false)

  async function save(v: string) {
    setVerdict(v)
    setSaving(true)
    await api.reviewSubmission(submission.id, v, notes)
    setSaving(false)
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <p className="font-medium text-ink">{submission.challengeTitle}</p>
        {submission.autoCheckPassed !== null && (
          <Badge tone={submission.autoCheckPassed ? 'signal' : 'warn'}>
            {submission.autoCheckPassed ? 'Auto-check passed' : 'Needs review'}
          </Badge>
        )}
      </div>
      <p className="mt-2 text-sm text-ink-dim">{submission.answer}</p>
      {submission.evidence && (
        <p className="mt-1 text-xs text-ink-faint italic">"{submission.evidence}"</p>
      )}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Reviewer notes…"
        rows={2}
        className="mt-2 w-full rounded-lg border border-border bg-surface-raised p-2 text-xs text-ink outline-none placeholder:text-ink-faint focus:border-flux"
      />
      <div className="mt-2 flex gap-2">
        <Button variant={verdict === 'pass' ? 'signal' : 'ghost'} className="px-3 py-1.5 text-xs" onClick={() => save('pass')} disabled={saving}>
          Pass
        </Button>
        <Button variant={verdict === 'partial' ? 'primary' : 'ghost'} className="px-3 py-1.5 text-xs" onClick={() => save('partial')} disabled={saving}>
          Partial
        </Button>
        <Button variant={verdict === 'fail' ? 'danger' : 'ghost'} className="px-3 py-1.5 text-xs" onClick={() => save('fail')} disabled={saving}>
          Fail
        </Button>
      </div>
    </div>
  )
}
