import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth'
import { consentRouter } from './routes/consent'
import { sessionsRouter } from './routes/sessions'
import { eventsRouter } from './routes/events'
import { submissionsRouter } from './routes/submissions'
import { recordingsRouter } from './routes/recordings'
import { challengesRouter } from './routes/challenges'
import { adminRouter } from './routes/admin'
import { requireAdminAuth } from './middleware/adminAuth'

const app = express()

const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5183')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: allowedOrigins,
  }),
)
// Raised from the 100kb default so a base64-encoded JPEG face-presence
// screenshot (see /api/events) fits comfortably in one request.
app.use(express.json({ limit: '2mb' }))

app.use('/api/auth', authRouter)
app.use('/api/consent', consentRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/events', eventsRouter)
app.use('/api/submissions', submissionsRouter)
app.use('/api/recordings', recordingsRouter)
app.use('/api/challenges', challengesRouter)
app.use('/api/admin', requireAdminAuth, adminRouter)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

const port = process.env.PORT ?? 4000
app.listen(port, () => console.log(`[api] listening on :${port}`))
