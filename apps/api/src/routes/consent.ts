import { Router } from 'express'
import { prisma } from '../db'

export const consentRouter = Router()

consentRouter.post('/', async (req, res) => {
  const { sessionId, consentVersion } = req.body as { sessionId?: string; consentVersion?: string }
  if (!sessionId || !consentVersion) return res.status(400).json({ error: 'Missing fields' })

  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'

  await prisma.session.update({
    where: { id: sessionId },
    data: { consentAt: new Date(), consentVersion, consentIp: ip },
  })

  res.json({ ok: true })
})
