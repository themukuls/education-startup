// Opaque bearer-token auth. Each browser gets a session token bound to a parent
// row; every user-data endpoint resolves the parent from the token and enforces
// that the child being touched belongs to them. No shared/global user.
//
// This is a real ownership boundary without needing OTP/SMS yet: the token is
// minted anonymously and upgraded to a claimed account when the parent saves
// name + phone. Cross-device login (verify the phone via WhatsApp/OTP) layers on
// top later — the seam is here.

import type { Request, Response, NextFunction } from 'express'
import { randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { getStore } from './db/index.ts'

export function newToken(): string {
  return randomBytes(32).toString('hex')
}

/** Store/lookup tokens by hash so a DB leak never exposes live sessions. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Verify Meta's X-Hub-Signature-256 on the WhatsApp webhook. Enforced only when
 * WHATSAPP_APP_SECRET is set (production); skipped in dev/mock. Needs the raw
 * request body (captured by express.json's verify hook).
 */
export function whatsappSignatureOk(req: Request & { rawBody?: Buffer }): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret) return true // not configured → dev/mock, allow
  const header = req.header('x-hub-signature-256') || ''
  const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}))
  const expected = 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex')
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Pull the bearer token from Authorization or the x-pp-token fallback header. */
export function bearer(req: Request): string | null {
  const h = req.header('authorization')
  if (h && h.toLowerCase().startsWith('bearer ')) return h.slice(7).trim()
  return req.header('x-pp-token')?.trim() || null
}

/** Gate a route: 401 unless a valid token resolves to a parent. Sets res.locals.parentId. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = bearer(req)
  if (!token) {
    res.status(401).json({ error: 'auth required' })
    return
  }
  try {
    const parentId = await (await getStore()).parentIdForToken(hashToken(token))
    if (!parentId) {
      res.status(401).json({ error: 'invalid or expired token' })
      return
    }
    res.locals.parentId = parentId
    next()
  } catch (err) {
    console.error('[auth] token check failed:', err)
    res.status(500).json({ error: 'auth failed' })
  }
}

/** True when childId exists and is owned by the authenticated parent. */
export async function ownsChild(res: Response, childId: string): Promise<boolean> {
  const child = await (await getStore()).getChild(childId)
  return !!child && child.parentId === res.locals.parentId
}
