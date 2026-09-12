import { Router } from 'express'
import fs from 'node:fs'
import { prisma } from '../db'

export const adminRouter = Router()

// NOTE: requireAdminAuth (server.ts) gates every route below on a shared
// secret. Phase 4 replaces this with real per-user SSO/email+password + RBAC;
// until then we take the caller-supplied x-admin-email at face value purely
// for audit-log attribution, not as an authorization check.
function actorEmail(req: import('express').Request) {
  return req.header('x-admin-email') || 'unknown'
}

adminRouter.get('/sessions', async (_req, res) => {
  const sessions = await prisma.session.findMany({
    include: { candidate: true, events: true, submissions: true },
    orderBy: { createdAt: 'desc' },
  })

  res.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      candidateName: s.candidate.name,
      candidateEmail: s.candidate.email,
      status: s.status,
      flagCount: s.events.length,
      score: computeScore(s.submissions),
      startedAt: s.startedAt,
    })),
  })
})

adminRouter.get('/sessions/:id', async (req, res) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: {
      candidate: true,
      events: { orderBy: { occurredAt: 'asc' } },
      submissions: { include: { challenge: true } },
      recordings: true,
    },
  })
  if (!session) return res.status(404).json({ error: 'Not found' })

  await prisma.auditLog.create({
    data: { actorEmail: actorEmail(req), action: 'viewed_session', targetId: session.id },
  })

  const hasWebcam = session.recordings.some((r) => r.channel === 'webcam')
  const hasScreen = session.recordings.some((r) => r.channel === 'screen')

  res.json({
    id: session.id,
    candidateName: session.candidate.name,
    candidateEmail: session.candidate.email,
    status: session.status,
    flagCount: session.events.length,
    score: computeScore(session.submissions),
    startedAt: session.startedAt,
    // Streamed on demand from concatenated chunks (see /recording/:channel below)
    // rather than pre-stitched, since this is dev-disk storage, not S3 yet.
    webcamUrl: hasWebcam ? `/api/admin/sessions/${session.id}/recording/webcam` : null,
    screenUrl: hasScreen ? `/api/admin/sessions/${session.id}/recording/screen` : null,
    events: session.events.map((e) => ({
      id: e.id,
      type: e.type,
      occurredAt: e.occurredAt,
      meta: e.metaJson ? JSON.parse(e.metaJson) : {},
      screenshotUrl: e.screenshotPath ? `/api/admin/events/${e.id}/screenshot` : null,
    })),
    submissions: session.submissions.map((s) => ({
      id: s.id,
      challengeTitle: s.challenge.title,
      answer: s.answer,
      evidence: s.evidence,
      autoCheckPassed: s.autoCheckPassed,
      reviewerVerdict: s.reviewerVerdict,
      reviewerNotes: s.reviewerNotes,
    })),
  })
})

// Chunks are recorded from a single continuous MediaRecorder(timeslice) call,
// so they're sequential fragments of one WebM container — concatenating their
// bytes in seq order reconstructs a normally playable file. Good enough for
// the MVP's on-disk storage; Phase 2 replaces this with S3 + signed URLs and
// (ideally) pre-stitching on upload rather than on every view.
adminRouter.get('/sessions/:id/recording/:channel', async (req, res) => {
  const { id, channel } = req.params
  if (channel !== 'webcam' && channel !== 'screen') {
    return res.status(400).json({ error: 'Invalid channel' })
  }

  const chunks = await prisma.recordingChunk.findMany({
    where: { sessionId: id, channel },
    orderBy: { seq: 'asc' },
  })
  if (chunks.length === 0) return res.status(404).json({ error: 'No recording available' })

  await prisma.auditLog.create({
    data: { actorEmail: actorEmail(req), action: 'viewed_recording', targetId: `${id}:${channel}` },
  })

  res.setHeader('Content-Type', 'video/webm')
  for (const chunk of chunks) {
    try {
      await new Promise<void>((resolve, reject) => {
        const stream = fs.createReadStream(chunk.path)
        stream.on('error', reject)
        stream.on('end', () => resolve())
        stream.pipe(res, { end: false })
      })
    } catch {
      break // a missing/corrupt chunk shouldn't take down the whole playback
    }
  }
  res.end()
})

adminRouter.get('/events/:eventId/screenshot', async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.eventId } })
  if (!event?.screenshotPath || !fs.existsSync(event.screenshotPath)) {
    return res.status(404).json({ error: 'No screenshot available' })
  }
  res.setHeader('Content-Type', 'image/jpeg')
  fs.createReadStream(event.screenshotPath).pipe(res)
})

adminRouter.post('/submissions/:id/review', async (req, res) => {
  const { verdict, notes } = req.body as { verdict?: string; notes?: string }
  const submission = await prisma.submission.update({
    where: { id: req.params.id },
    data: { reviewerVerdict: verdict, reviewerNotes: notes },
  })

  await prisma.auditLog.create({
    data: { actorEmail: actorEmail(req), action: 'reviewed_submission', targetId: submission.id },
  })

  res.json({ submission })
})

function computeScore(submissions: { reviewerVerdict: string | null; autoCheckPassed: boolean | null }[]) {
  if (submissions.length === 0) return null
  const reviewed = submissions.filter((s) => s.reviewerVerdict !== null)
  if (reviewed.length < submissions.length) return null
  const points = reviewed.reduce((sum, s) => {
    if (s.reviewerVerdict === 'pass') return sum + 1
    if (s.reviewerVerdict === 'partial') return sum + 0.5
    return sum
  }, 0)
  return Math.round((points / submissions.length) * 100)
}
