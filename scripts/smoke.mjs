#!/usr/bin/env node
// Post-deploy smoke test — exercises the critical API path against a running
// server. Zero dependencies (uses global fetch). Point it at any environment:
//
//   SMOKE_BASE=https://your-api.onrender.com node scripts/smoke.mjs
//   npm run smoke            # defaults to http://localhost:8787
//
// Exits non-zero if anything fails, so it works as a CI / deploy gate.

const BASE = (process.env.SMOKE_BASE || process.argv[2] || 'http://localhost:8787').replace(/\/$/, '')

let pass = 0
let fail = 0
const ok = (cond, msg) => {
  if (cond) {
    pass++
    console.log(`  \x1b[32m✓\x1b[0m ${msg}`)
  } else {
    fail++
    console.log(`  \x1b[31m✗ ${msg}\x1b[0m`)
  }
}

async function req(method, path, { token, body } = {}) {
  const headers = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  let json = null
  try {
    json = await res.json()
  } catch {
    /* non-JSON (e.g. export download) */
  }
  return { status: res.status, json }
}

async function main() {
  console.log(`\nParentProof smoke test → ${BASE}\n`)

  // health
  const health = await req('GET', '/api/health')
  ok(health.status === 200 && health.json?.ok, `health ok (db=${health.json?.db}, llm=${health.json?.llm})`)

  // anonymous session
  const session = await req('POST', '/api/auth/session')
  const token = session.json?.token
  ok(!!token, 'mints an anonymous session token')

  // starts empty
  const me0 = await req('GET', '/api/me', { token })
  ok(me0.status === 200 && Array.isArray(me0.json?.children) && me0.json.children.length === 0, 'new account starts with no children')

  // auth is enforced
  const noauth = await req('GET', '/api/me')
  ok(noauth.status === 401, 'unauthenticated /api/me is 401')

  // create a child
  const created = await req('POST', '/api/children', { token, body: { name: 'SmokeKid', board: 'CBSE', klass: 10, subjects: ['Maths'] } })
  const childId = created.json?.child?.id
  ok(!!childId, 'creates a child')

  // fresh report doesn't crash
  const rep0 = await req('GET', `/api/report/${childId}`, { token })
  ok(rep0.status === 200 && rep0.json?.testsTaken === 0, 'fresh child report computes (0 tests)')

  // record a test
  const sess = await req('POST', '/api/sessions', {
    token,
    body: { childId, answers: [{ chapter: 'Quadratics', cogLevel: 'A', format: 'NUM', itemDifficulty: 0.6, correct: true, responseTimeSec: 70, position: 1 }] },
  })
  ok(sess.status === 200 && sess.json?.report?.testsTaken === 1, 'recording a test updates the report')

  // ownership: a second account cannot read the first's child
  const other = await req('POST', '/api/auth/session')
  const cross = await req('GET', `/api/report/${childId}`, { token: other.json?.token })
  ok(cross.status === 404, 'cross-account child read is 404')

  // accuracy
  const acc = await req('GET', `/api/accuracy/${childId}`, { token })
  ok(acc.status === 200 && acc.json?.stats, 'accuracy endpoint returns stats')

  // RAG corpus seeded + retrieval
  const rag = await req('GET', '/api/rag/status')
  ok(rag.status === 200 && rag.json?.chunks > 0, `RAG corpus seeded (${rag.json?.chunks} chunks)`)

  // claim + cross-device login (mock returns devCode)
  await req('POST', '/api/account', { token, body: { name: 'SmokeParent', phone: '+91 90000 12345' } })
  const start = await req('POST', '/api/auth/login/start', { body: { phone: '919000012345' } })
  ok(start.status === 200, 'login/start responds')
  if (start.json?.devCode) {
    const verify = await req('POST', '/api/auth/login/verify', { body: { phone: '919000012345', code: start.json.devCode } })
    const me2 = await req('GET', '/api/me', { token: verify.json?.token })
    ok(me2.json?.children?.[0]?.id === childId, 'cross-device login resumes the same account')
  } else {
    console.log('  · login delivery is live (no devCode) — skipping verify')
  }

  // DPDP export
  const exp = await req('GET', '/api/me/export', { token })
  ok(exp.status === 200 && exp.json?.parent, 'DPDP export returns account data')

  // DPDP delete cascades
  const del = await req('DELETE', '/api/me', { token })
  const after = await req('GET', '/api/me', { token })
  ok(del.status === 200 && after.status === 401, 'DPDP delete removes the account (token 401s)')

  console.log(`\n${fail === 0 ? '\x1b[32m' : '\x1b[31m'}${pass} passed, ${fail} failed\x1b[0m\n`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('\x1b[31msmoke test crashed:\x1b[0m', err)
  process.exit(1)
})
