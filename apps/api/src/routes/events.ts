import { Router } from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { prisma } from '../db'

export const eventsRouter = Router()

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads')

// Every proctoring signal lands here as a flag for later human review —
// nothing in this route blocks or judges the candidate.
eventsRouter.post('/', async (req, res) => {
  const { sessionId, type, meta, screenshotBase64 } = req.body as {
    sessionId?: string
    type?: string
    meta?: Record<string, unknown>
    screenshotBase64?: string
  }
  if (!sessionId || !type) return res.status(400).json({ error: 'Missing fields' })

  // sessionId is an unguessable cuid handed to the candidate at redeem time —
  // it's this app's bearer credential for candidate-side calls (same model as
  // /submissions and /sessions/finish). We just confirm it names a real,
  // still-active session so a stray/foreign id can't be used to pad or pollute
  // another candidate's flag timeline.
  const session = await prisma.session.findUnique({ where: { id: sessionId } })
  if (!session || session.status !== 'in_progress') {
    return res.status(404).json({ error: 'Session not found or not active' })
  }

  let screenshotPath: string | null = null
  if (screenshotBase64) {
    // sessionId is already confirmed to name a real session above, so it's
    // safe to use directly as a path segment here.
    const dir = path.join(UPLOAD_ROOT, sessionId, 'flags')
    fs.mkdirSync(dir, { recursive: true })
    const filename = `${Date.now()}-${type}.jpg`
    const filePath = path.join(dir, filename)
    fs.writeFileSync(filePath, Buffer.from(screenshotBase64, 'base64'))
    screenshotPath = filePath
  }

  const event = await prisma.event.create({
    data: {
      sessionId,
      type,
      metaJson: meta ? JSON.stringify(meta) : null,
      screenshotPath,
    },
  })

  res.status(201).json({ ok: true, eventId: event.id })
})
