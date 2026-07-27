// Integration test: boots the real API server as a subprocess in mock mode
// (temp SQLite DB, no external services) and exercises the critical HTTP path
// end-to-end. Run with: npx vitest run server/api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rmSync } from 'node:fs'

const PORT = 8899
const BASE = `http://localhost:${PORT}`
const DB_PATH = join(tmpdir(), `parentproof-test-${randomUUID()}.db`)

let child: ChildProcess

const api = (path: string, init?: RequestInit) => fetch(`${BASE}${path}`, init)

// Response.json() is typed `unknown` here; tests assert on dynamic shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = (res: Response): Promise<any> => res.json() as Promise<any>

const authHeaders = (token: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
})

// Mint a fresh anonymous session and return its bearer token.
async function mintToken(): Promise<string> {
  const res = await api('/api/auth/session', { method: 'POST' })
  expect(res.status).toBe(200)
  const body = await json(res)
  expect(typeof body.token).toBe('string')
  expect(body.token.length).toBeGreaterThan(0)
  return body.token
}

beforeAll(async () => {
  child = spawn('npx', ['tsx', 'server/index.ts'], {
    env: { ...process.env, PORT: String(PORT), DB_PATH, DATABASE_URL: '' },
    stdio: 'ignore',
  })

  // Poll health until the server is up (or bail if the child dies early).
  const deadline = Date.now() + 25_000
  let healthy = false
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`server process exited early with code ${child.exitCode}`)
    }
    try {
      const res = await api('/api/health')
      if (res.status === 200) {
        healthy = true
        break
      }
    } catch {
      // not listening yet — keep polling
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  if (!healthy) throw new Error('server never became healthy within 25s')
}, 30_000)

afterAll(() => {
  if (child && child.exitCode === null) child.kill('SIGKILL')
  // SQLite may leave -wal / -shm sidecar files alongside the main DB.
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    try {
      rmSync(DB_PATH + suffix, { force: true })
    } catch {
      // best-effort cleanup
    }
  }
})

describe('ParentProof API (mock mode, temp SQLite)', () => {
  it('GET /api/health reports ok in mock mode', async () => {
    const res = await api('/api/health')
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.ok).toBe(true)
    expect(body.llm).toBe('mock')
    expect(body.db).toBe('sqlite')
  })

  it('POST /api/auth/session mints a token', async () => {
    const token = await mintToken()
    expect(token).toBeTruthy()
  })

  it('GET /api/me without a token returns 401', async () => {
    const res = await api('/api/me')
    expect(res.status).toBe(401)
  })

  it('GET /api/me with a token returns the parent and no children', async () => {
    const token = await mintToken()
    const res = await api('/api/me', { headers: authHeaders(token) })
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.parent).toBeTruthy()
    expect(typeof body.parent.id).toBe('string')
    expect(Array.isArray(body.children)).toBe(true)
    expect(body.children).toHaveLength(0)
  })

  it('POST /api/children creates a child owned by the session', async () => {
    const token = await mintToken()
    const res = await api('/api/children', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ name: 'Aarav', board: 'CBSE', klass: 10, subjects: ['Maths', 'Science'] }),
    })
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.child).toBeTruthy()
    expect(typeof body.child.id).toBe('string')
    expect(body.child.name).toBe('Aarav')

    // and it now shows up under /api/me
    const me = await json(await api('/api/me', { headers: authHeaders(token) }))
    expect(me.children.map((c: { id: string }) => c.id)).toContain(body.child.id)
  })

  it('GET /api/report/:childId returns a fresh (empty) report', async () => {
    const token = await mintToken()
    const created = await json(
      await api('/api/children', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ name: 'Diya', board: 'CBSE', klass: 9, subjects: ['Maths'] }),
      }),
    )
    const childId = created.child.id

    const res = await api(`/api/report/${childId}`, { headers: authHeaders(token) })
    expect(res.status).toBe(200)
    const report = await json(res)
    expect(report.testsTaken).toBe(0)
  })

  it("a second session cannot read the first session's child (404)", async () => {
    const tokenA = await mintToken()
    const created = await json(
      await api('/api/children', {
        method: 'POST',
        headers: authHeaders(tokenA),
        body: JSON.stringify({ name: 'Ishaan', board: 'CBSE', klass: 8, subjects: ['Maths'] }),
      }),
    )
    const childId = created.child.id

    const tokenB = await mintToken()
    const res = await api(`/api/report/${childId}`, { headers: authHeaders(tokenB) })
    expect(res.status).toBe(404)
  })

  it('GET /api/rag/status reports a seeded corpus', async () => {
    const res = await api('/api/rag/status')
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body.chunks).toBeGreaterThan(0)
  })

  it('mock payment flow activates a plan (order → verify → /api/me)', async () => {
    const token = await mintToken()

    // A guest starts on the free plan.
    const before = await json(await api('/api/me', { headers: authHeaders(token) }))
    expect(before.parent.plan).toBe('free')

    // Create a mock order (no Razorpay keys → order_mock_*).
    const order = await json(
      await api('/api/pay/order', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ plan: 'core' }),
      }),
    )
    expect(order.mock).toBe(true)
    expect(order.orderId).toMatch(/^order_mock_/)
    expect(order.amount).toBe(99900)

    // Verify the (mock) payment — activates the entitlement.
    const verified = await json(
      await api('/api/pay/verify', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ orderId: order.orderId, paymentId: 'pay_mock', signature: 'mock', plan: 'core' }),
      }),
    )
    expect(verified.ok).toBe(true)
    expect(verified.plan).toBe('core')

    // The plan is now reflected on the account.
    const after = await json(await api('/api/me', { headers: authHeaders(token) }))
    expect(after.parent.plan).toBe('core')
  })

  it('POST /api/pay/order rejects an unknown plan', async () => {
    const token = await mintToken()
    const res = await api('/api/pay/order', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ plan: 'lifetime' }),
    })
    expect(res.status).toBe(400)
  })

  it('GET /api/accuracy/aggregate returns anonymised stats', async () => {
    const res = await api('/api/accuracy/aggregate')
    expect(res.status).toBe(200)
    const body = await json(res)
    expect(body).toHaveProperty('predictions')
    expect(body).toHaveProperty('within8Pct')
    expect(body).toHaveProperty('children')
    expect(typeof body.predictions).toBe('number')
    expect(typeof body.children).toBe('number')
  })
})
