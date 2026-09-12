import { Router } from 'express'
import { prisma } from '../db'

export const sessionsRouter = Router()

const ASSESSMENT_DURATION_MINUTES = 90

sessionsRouter.post('/start', async (req, res) => {
  const { sessionId } = req.body as { sessionId?: string }
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' })

  const session = await prisma.session.findUnique({ where: { id: sessionId } })
  if (!session) return res.status(404).json({ error: 'Session not found' })
  if (!session.consentAt) return res.status(403).json({ error: 'Consent not recorded' })

  // Server owns the clock — client-reported timers are never trusted for scoring.
  const endsAt = session.endsAt ?? new Date(Date.now() + ASSESSMENT_DURATION_MINUTES * 60_000)

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: 'in_progress',
      startedAt: session.startedAt ?? new Date(),
      endsAt,
    },
  })

  const challenges = await prisma.challenge.findMany({ orderBy: { order: 'asc' } })

  res.json({
    endsAt: updated.endsAt,
    challenges: challenges.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
    })),
  })
})

sessionsRouter.post('/finish', async (req, res) => {
  const { sessionId } = req.body as { sessionId?: string }
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' })

  await prisma.session.update({
    where: { id: sessionId },
    data: { status: 'submitted', submittedAt: new Date() },
  })

  res.json({ ok: true })
})
