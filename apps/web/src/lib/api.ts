const BASE = '/api'

function adminHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('adminToken')
  const email = sessionStorage.getItem('adminEmail')
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (email) headers['x-admin-email'] = email
  return headers
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isAdmin = path.startsWith('/admin')
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(isAdmin ? adminHeaders() : {}),
    },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }
  return res.json()
}

// Video/screenshot endpoints require the admin bearer token, which a plain
// <video src>/<img src> can't attach — so we fetch the bytes ourselves and
// hand back a local blob: URL for the element to point at instead.
// NOTE: `path` here is already a full "/api/..." path as returned by the
// admin session-detail response — do not prefix it with BASE again.
async function fetchAdminBlobUrl(path: string): Promise<string | null> {
  const res = await fetch(path, { headers: adminHeaders() })
  if (!res.ok) return null
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export const api = {
  redeemInvite: (token: string) =>
    request<{ session: { id: string; candidateName: string; candidateEmail: string } }>(
      '/auth/redeem',
      { method: 'POST', body: JSON.stringify({ token }) },
    ),
  recordConsent: (sessionId: string, consentVersion: string) =>
    request('/consent', {
      method: 'POST',
      body: JSON.stringify({ sessionId, consentVersion }),
    }),
  startSession: (sessionId: string) =>
    request<{
      challenges: { id: string; slug: string; title: string; description: string }[]
      endsAt: string
    }>(
      '/sessions/start',
      { method: 'POST', body: JSON.stringify({ sessionId }) },
    ),
  logEvent: (
    sessionId: string,
    type: string,
    meta?: Record<string, unknown>,
    screenshotBase64?: string,
  ) =>
    request('/events', {
      method: 'POST',
      body: JSON.stringify({ sessionId, type, meta, screenshotBase64, clientTimestamp: Date.now() }),
    }).catch(() => {}),
  submitAnswer: (
    sessionId: string,
    challengeId: string,
    answer: string,
    evidence?: string,
  ) =>
    request('/submissions', {
      method: 'POST',
      body: JSON.stringify({ sessionId, challengeId, answer, evidence }),
    }),
  finishSession: (sessionId: string) =>
    request('/sessions/finish', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),
  uploadChunk: (sessionId: string, blob: Blob, seq: number, channel: 'webcam' | 'screen' = 'webcam') => {
    const form = new FormData()
    // sessionId/seq/channel must precede the file field — the backend's
    // multer diskStorage callbacks read them off req.body while the file is
    // still streaming in, so they need to already be parsed by that point.
    form.append('sessionId', sessionId)
    form.append('seq', String(seq))
    form.append('channel', channel)
    form.append('chunk', blob, `chunk-${seq}.webm`)
    return fetch(`${BASE}/recordings/chunk`, { method: 'POST', body: form })
  },
  listSessions: () =>
    request<{ sessions: AdminSessionSummary[] }>('/admin/sessions'),
  getSession: (id: string) => request<AdminSessionDetail>(`/admin/sessions/${id}`),
  getRecordingBlobUrl: (path: string) => fetchAdminBlobUrl(path),
  getScreenshotBlobUrl: (path: string) => fetchAdminBlobUrl(path),
  reviewSubmission: (id: string, verdict: string, notes: string) =>
    request(`/admin/submissions/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ verdict, notes }),
    }),
}

export interface AdminSessionSummary {
  id: string
  candidateName: string
  candidateEmail: string
  status: 'in_progress' | 'submitted' | 'reviewed'
  flagCount: number
  score: number | null
  startedAt: string | null
}

export interface AdminSessionDetail extends AdminSessionSummary {
  events: {
    id: string
    type: string
    occurredAt: string
    meta: Record<string, unknown>
    screenshotUrl: string | null
  }[]
  submissions: {
    id: string
    challengeTitle: string
    answer: string
    evidence: string | null
    autoCheckPassed: boolean | null
    reviewerVerdict: string | null
    reviewerNotes: string | null
  }[]
  webcamUrl: string | null
  screenUrl: string | null
}
