// Client-side session. On first load we mint an anonymous session token and
// store it; every authenticated request carries it. `/api/me` tells us which
// parent + children this token owns, replacing the old hardcoded child id.

const API_BASE = import.meta.env.VITE_API_BASE ?? ''
const TOKEN_KEY = 'pp.token'

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}
function setToken(t: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, t)
  } catch {
    /* private mode */
  }
}

export function authHeaders(): Record<string, string> {
  const t = getToken()
  return t ? { authorization: `Bearer ${t}` } : {}
}

let sessionP: Promise<string> | null = null

/** Ensure a token exists (mint one if not). Deduped so it runs at most once. */
export function ensureSession(): Promise<string> {
  const existing = getToken()
  if (existing) return Promise.resolve(existing)
  if (!sessionP) {
    sessionP = fetch(`${API_BASE}/api/auth/session`, { method: 'POST', signal: AbortSignal.timeout(15_000) })
      .then((r) => {
        if (!r.ok) throw new Error(`session ${r.status}`)
        return r.json()
      })
      .then((d: { token: string }) => {
        setToken(d.token)
        return d.token
      })
      .catch((e) => {
        sessionP = null
        throw e
      })
  }
  return sessionP
}

export interface ChildDTO {
  id: string
  parentId: string
  name: string
  board: string
  klass: number
  subjects: string[]
  monthlySpend: number
}

export interface Me {
  parent: { id: string; name: string; phone: string; channel: string; claimed: boolean } | null
  children: ChildDTO[]
}

export async function fetchMe(): Promise<Me> {
  const res = await fetch(`${API_BASE}/api/me`, { headers: { ...authHeaders() }, signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`me ${res.status}`)
  return res.json()
}

// ---- Cross-device login (resume a claimed account on a new device) ----

/** Request a one-time code sent to the account's WhatsApp. In mock mode the
 * backend returns `devCode` so the flow is testable without WhatsApp creds. */
export async function startLogin(phone: string): Promise<{ ok: boolean; devCode?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/login/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`login start ${res.status}`)
  return res.json()
}

/** Verify the code; on success the returned token replaces this device's session. */
export async function verifyLogin(phone: string, code: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/login/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone, code }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) {
    const e = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(e.error || `login verify ${res.status}`)
  }
  const d = (await res.json()) as { token: string }
  setToken(d.token)
}
