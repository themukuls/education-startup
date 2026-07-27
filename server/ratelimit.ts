// Minimal in-memory fixed-window rate limiter, keyed by client IP + route.
// Enough to blunt brute-force on login codes and session spam on a single
// instance. For multi-instance, back it with Redis (same interface).

import type { Request, Response, NextFunction } from 'express'

interface Bucket {
  count: number
  resetAt: number
}
const buckets = new Map<string, Bucket>()

export function rateLimit({ windowMs, max, name }: { windowMs: number; max: number; name: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown'
    const key = `${name}:${ip}`
    const now = Date.now()
    const b = buckets.get(key)
    if (!b || now > b.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }
    if (b.count >= max) {
      res.set('Retry-After', String(Math.ceil((b.resetAt - now) / 1000)))
      return res.status(429).json({ error: 'too many requests, slow down' })
    }
    b.count++
    next()
  }
}

// occasional cleanup so the map can't grow unbounded
setInterval(() => {
  const now = Date.now()
  for (const [k, b] of buckets) if (now > b.resetAt) buckets.delete(k)
}, 60_000).unref?.()
