import type { NextFunction, Request, Response } from 'express'

// Stop-gap admin auth for the MVP slice: a single shared secret, checked
// against every /api/admin/* request. Phase 4 replaces this with real
// per-user SSO/email+password + RBAC (admin vs reviewer) — this only exists
// so the admin API isn't wide open in the meantime.
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ADMIN_TOKEN
  if (!expected) {
    // Fail closed: an unconfigured secret should never mean "open to everyone."
    return res.status(500).json({ error: 'Admin auth is not configured on the server' })
  }

  const header = req.header('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token || token !== expected) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  next()
}
