import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { prisma } from '../db'

export const recordingsRouter = Router()

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads')

const SESSION_ID_RE = /^[a-z0-9]{1,64}$/i
const CHANNEL_RE = /^(webcam|screen)$/
const SEQ_RE = /^\d{1,10}$/

// req.body.sessionId/channel/seq are only populated here if those text fields
// appear *before* the file field in the multipart stream — the client must
// append them first (see api.ts uploadChunk).
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const sessionId = req.body.sessionId as string | undefined
    const channel = (req.body.channel as string | undefined) || 'webcam'
    if (!sessionId || !SESSION_ID_RE.test(sessionId) || !CHANNEL_RE.test(channel)) {
      cb(new Error('Invalid sessionId or channel'), '')
      return
    }
    const dir = path.join(UPLOAD_ROOT, sessionId, channel)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, _file, cb) => {
    const seq = req.body.seq as string | undefined
    if (!seq || !SEQ_RE.test(seq)) {
      cb(new Error('Invalid seq'), '')
      return
    }
    cb(null, `chunk-${seq}.webm`)
  },
})

const upload = multer({ storage })

// Chunked upload (see prompt.md §4/§8): each ~10s webcam/screen chunk lands here
// as it's recorded, so a crash or dropped connection loses at most one chunk,
// never the whole session. In production this would go straight to S3
// multipart instead of disk.
recordingsRouter.post('/chunk', upload.single('chunk'), async (req, res) => {
  const { sessionId, seq, channel } = req.body as { sessionId: string; seq: string; channel?: string }
  if (!req.file) return res.status(400).json({ error: 'Missing chunk' })

  const session = await prisma.session.findUnique({ where: { id: sessionId } })
  // Unlike /submissions and /events (cut off the instant the session finishes,
  // since answers/flags shouldn't change after submission), the final chunk
  // flushed by stopAllRecording()'s recorder.stop() call legitimately arrives
  // after status has already flipped to 'submitted' — so we accept any status
  // past 'invited' rather than requiring 'in_progress' specifically.
  if (!session || session.status === 'invited') {
    return res.status(404).json({ error: 'Session not found or not started' })
  }

  await prisma.recordingChunk.create({
    data: { sessionId, seq: Number(seq), channel: channel || 'webcam', path: req.file.path },
  })

  res.status(201).json({ ok: true })
})

// Multer's diskStorage errors (invalid sessionId/channel/seq) land here rather
// than at the route handler above.
recordingsRouter.use((err: Error, _req: unknown, res: import('express').Response, _next: import('express').NextFunction) => {
  res.status(400).json({ error: err.message || 'Upload failed' })
})
