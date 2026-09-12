import { Router } from 'express'
import { prisma } from '../db'

export const submissionsRouter = Router()

submissionsRouter.post('/', async (req, res) => {
  const { sessionId, challengeId, answer, evidence } = req.body as {
    sessionId?: string
    challengeId?: string
    answer?: string
    evidence?: string
  }
  if (!sessionId || !challengeId || !answer) {
    return res.status(400).json({ error: 'Missing fields' })
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } })
  if (!session) return res.status(404).json({ error: 'Session not found' })

  // Server owns the clock and the status transition — a candidate whose timer
  // has expired, or who already finished, cannot keep submitting/overwriting
  // answers no matter what their client reports.
  if (session.status !== 'in_progress') {
    return res.status(403).json({ error: 'Session is not accepting submissions' })
  }
  if (session.endsAt && session.endsAt.getTime() < Date.now()) {
    return res.status(403).json({ error: 'Time limit has passed' })
  }

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' })

  // Auto-check where a fixed expected pattern exists (e.g. regex-matchable secrets);
  // challenges without one (chatbot/RAG-style) are always left for human review.
  const autoCheckPassed = challenge.expectedAnswerRegex
    ? new RegExp(challenge.expectedAnswerRegex, 'i').test(answer)
    : null

  const submission = await prisma.submission.upsert({
    where: { sessionId_challengeId: { sessionId, challengeId } },
    update: { answer, evidence, autoCheckPassed },
    create: { sessionId, challengeId, answer, evidence, autoCheckPassed },
  })

  res.status(201).json({ submission })
})
