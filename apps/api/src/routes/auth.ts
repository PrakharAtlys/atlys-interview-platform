import { Router } from 'express'
import { prisma } from '../db'

export const authRouter = Router()

// Candidates arrive via a unique, expiring invite token (magic-link style).
// No public sign-up — sessions/candidates are created by an admin invite flow (Phase 4).
authRouter.post('/redeem', async (req, res) => {
  const { token } = req.body as { token?: string }
  if (!token) return res.status(400).json({ error: 'Missing token' })

  const session = await prisma.session.findUnique({
    where: { inviteToken: token },
    include: { candidate: true },
  })

  if (!session) return res.status(404).json({ error: 'Invite not found or already used' })
  if (session.status !== 'invited') {
    return res.status(410).json({ error: 'This invite has already been used' })
  }

  res.json({
    session: {
      id: session.id,
      candidateName: session.candidate.name,
      candidateEmail: session.candidate.email,
    },
  })
})
