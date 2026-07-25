// ParentProof API server — holds the Anthropic key and exposes question
// generation. Runs in mock mode automatically when no key is present.

import express from 'express'
import cors from 'cors'
import { randomUUID } from 'node:crypto'
import { generateTest } from './generate.ts'
import { renderCard } from './render.ts'
import { sendCard, hasWhatsApp } from './whatsapp.ts'
import { pickCreds, credsFromHeaders, credsFromEnv, llmText } from './llm/index.ts'
import { getStore, storeKind, mintAnonAccount, seedDemoChild } from './db/index.ts'
import { requireAuth, ownsChild, newToken } from './auth.ts'
import { computeReport } from '../src/engine/index.ts'
import { predictBand, resolvePredictions, accuracyStats, calibrationFrom } from '../src/engine/accuracy.ts'
import type { AnswerEvent } from '../src/engine/types.ts'
import { toQuestions, type GenerateRequest } from '../src/shared/quiz.ts'
import type { RenderRequest, CardCopy } from '../src/shared/card.ts'
import { normalizePhone } from '../src/shared/whatsapp.ts'

const app = express()
// Open by default (easy local dev); in production set CORS_ORIGIN to the
// Vercel origin(s) — comma-separated — so only your frontend can call the API.
const CORS_ORIGIN = process.env.CORS_ORIGIN?.trim()
app.use(cors(CORS_ORIGIN ? { origin: CORS_ORIGIN.split(',').map((o) => o.trim()) } : {}))
app.use(express.json({ limit: '256kb' }))

const PORT = Number(process.env.PORT ?? 8787)

app.get('/api/health', (_req, res) => {
  const env = credsFromEnv()
  res.json({
    ok: true,
    llm: env ? 'env' : 'mock',
    provider: env?.provider ?? null,
    whatsapp: hasWhatsApp() ? 'live' : 'mock',
    db: storeKind,
  })
})

app.post('/api/generate-test', async (req, res) => {
  const b = req.body ?? {}
  const request: GenerateRequest = {
    board: String(b.board ?? 'CBSE'),
    klass: Number(b.klass ?? 10),
    subject: String(b.subject ?? 'Maths'),
    chapter: String(b.chapter ?? 'Quadratics'),
    count: Math.min(15, Math.max(1, Number(b.count ?? 9))),
    mix: b.mix,
  }

  try {
    const { items, source, provider } = await generateTest(request, pickCreds(req))
    if (!items.length) {
      return res.status(502).json({ error: 'no valid questions produced', source })
    }
    const questions = toQuestions(items, request.subject, request.chapter)
    res.json({ questions, source, provider, meta: { requested: request.count, delivered: questions.length } })
  } catch (err) {
    console.error('[generate-test] failed:', err)
    res.status(500).json({ error: 'generation failed', detail: String((err as Error).message ?? err) })
  }
})

app.post('/api/render-card', async (req, res) => {
  const b = req.body ?? {}
  const request: RenderRequest = {
    childName: String(b.childName ?? 'your child'),
    subject: String(b.subject ?? 'Maths'),
    chapter: String(b.chapter ?? ''),
    polarity: b.polarity === 'positive' ? 'positive' : 'negative',
    finding: String(b.finding ?? ''),
    detail: String(b.detail ?? ''),
    actionTonight: String(b.actionTonight ?? ''),
  }
  if (!request.finding) return res.status(400).json({ error: 'missing finding' })

  try {
    const { card, source } = await renderCard(request, pickCreds(req))
    res.json({ card, source })
  } catch (err) {
    console.error('[render-card] failed:', err)
    res.status(500).json({ error: 'render failed' })
  }
})

// ---- LLM: report configured provider + test a key (BYOK) --------------------
app.get('/api/llm/status', (req, res) => {
  const env = credsFromEnv()
  const header = credsFromHeaders(req)
  res.json({
    envProvider: env?.provider ?? null,
    envModel: env?.model ?? null,
    requestProvider: header?.provider ?? null,
    mode: header ? 'byok' : env ? 'env' : 'mock',
  })
})

// Test a provider/key round-trip. Uses BYOK headers if present, else env.
app.post('/api/llm/test', async (req, res) => {
  const creds = pickCreds(req)
  if (!creds) return res.json({ ok: false, mode: 'mock', message: 'No provider configured — app runs in mock mode.' })
  try {
    const reply = await llmText(creds, {
      system: 'You are a connectivity check. Reply with exactly one word.',
      user: 'Reply with the single word: pong',
      maxTokens: 16,
      timeoutMs: 20_000,
    })
    res.json({ ok: true, provider: creds.provider, model: creds.model, sample: reply.trim().slice(0, 40) })
  } catch (err) {
    res.json({ ok: false, provider: creds.provider, model: creds.model, error: String((err as Error).message ?? err).slice(0, 300) })
  }
})

// ---- Auth: anonymous session + who am I -------------------------------------

// Mint a fresh anonymous account (own parent + own seeded demo child) and return
// a bearer token. The client calls this once and stores the token.
app.post('/api/auth/session', async (_req, res) => {
  try {
    const store = await getStore()
    const { parentId } = await mintAnonAccount(store)
    const token = newToken()
    await store.createToken(token, parentId)
    res.json({ token })
  } catch (err) {
    console.error('[auth/session] failed:', err)
    res.status(500).json({ error: 'could not create session' })
  }
})

// The authenticated parent + the children they own.
app.get('/api/me', requireAuth, async (_req, res) => {
  const store = await getStore()
  const parent = await store.getParent(res.locals.parentId)
  const children = await store.getChildrenForParent(res.locals.parentId)
  res.json({
    parent: parent && { id: parent.id, name: parent.name, phone: parent.phone, channel: parent.channel, claimed: !!parent.claimed },
    children,
  })
})

// Add a child to the authenticated parent.
app.post('/api/children', requireAuth, async (req, res) => {
  const b = req.body ?? {}
  const name = String(b.name ?? '').trim()
  if (!name) return res.status(400).json({ error: 'name required' })
  const store = await getStore()
  const child = {
    id: `c_${randomUUID()}`,
    parentId: res.locals.parentId,
    name,
    board: String(b.board ?? 'CBSE'),
    klass: Number(b.klass ?? 10),
    subjects: Array.isArray(b.subjects) ? b.subjects.map(String) : ['Maths'],
    monthlySpend: Number(b.monthlySpend ?? 0),
  }
  try {
    await store.upsertChild(child)
    if (b.seedDemo) await seedDemoChild(store, res.locals.parentId, child.id, child.name)
    res.json({ ok: true, child })
  } catch (err) {
    console.error('[children] failed:', err)
    res.status(500).json({ error: 'could not add child' })
  }
})

// ---- Persistence: a child's real learning record ----

app.get('/api/child/:childId', requireAuth, async (req, res) => {
  if (!(await ownsChild(res, req.params.childId))) return res.status(404).json({ error: 'child not found' })
  res.json(await (await getStore()).getChild(req.params.childId))
})

// Compute the report from the child's STORED event history (not synthetic data).
app.get('/api/report/:childId', requireAuth, async (req, res) => {
  if (!(await ownsChild(res, req.params.childId))) return res.status(404).json({ error: 'child not found' })
  const store = await getStore()
  try {
    const input = await store.getEngineInput(req.params.childId, Date.now())
    res.json(computeReport(input))
  } catch (err) {
    console.error('[report] failed:', err)
    res.status(500).json({ error: 'report failed' })
  }
})

// Record a completed test: persist the session + its answers, then return the
// recomputed report so the child's profile updates immediately.
app.post('/api/sessions', requireAuth, async (req, res) => {
  const b = req.body ?? {}
  const childId = String(b.childId ?? '')
  const raw = Array.isArray(b.answers) ? b.answers : []
  if (!childId || raw.length === 0) return res.status(400).json({ error: 'childId and answers required' })

  if (!(await ownsChild(res, childId))) return res.status(404).json({ error: 'child not found' })
  const store = await getStore()

  const now = Date.now()
  const sessionId = randomUUID()
  const answers: AnswerEvent[] = raw.map((a: Record<string, unknown>, i: number) => ({
    childId,
    itemId: String(a.itemId ?? `${sessionId}-q${i + 1}`),
    chapter: String(a.chapter ?? 'Unknown'),
    cogLevel: (a.cogLevel === 'R' || a.cogLevel === 'U' || a.cogLevel === 'A' ? a.cogLevel : 'U') as AnswerEvent['cogLevel'],
    format: (a.format === 'NUM' ? 'NUM' : 'MCQ') as AnswerEvent['format'],
    itemDifficulty: typeof a.itemDifficulty === 'number' ? a.itemDifficulty : 0.5,
    correct: !!a.correct,
    responseTimeSec: typeof a.responseTimeSec === 'number' ? a.responseTimeSec : 30,
    answerChanged: !!a.answerChanged,
    skipped: !!a.skipped,
    sessionId,
    timestamp: now,
    position: typeof a.position === 'number' ? a.position : i + 1,
  }))

  try {
    await store.addSession({ sessionId, childId, type: 'weekly', assignedAt: now, completed: true, abandonedAtQ: null })
    await store.addAnswers(answers)
    const report = computeReport(await store.getEngineInput(childId, Date.now()))
    res.json({ ok: true, sessionId, report })
  } catch (err) {
    console.error('[sessions] failed:', err)
    res.status(500).json({ error: 'save failed' })
  }
})

// ---- Account: claim a guest record (lightweight; full auth comes later) ----

app.post('/api/account', requireAuth, async (req, res) => {
  const b = req.body ?? {}
  const name = String(b.name ?? 'Parent').trim() || 'Parent'
  const phone = String(b.phone ?? '').trim()
  const channel = b.channel === 'whatsapp' ? 'whatsapp' : 'manual'
  try {
    // upgrade THIS authenticated parent from anonymous to claimed. A WhatsApp
    // claim may arrive with no phone yet — the inbound webhook fills in the
    // verified number when the parent's message lands (no OTP).
    await (await getStore()).upsertParent({ id: res.locals.parentId, name, phone, channel, claimed: true })
    res.json({ ok: true, channel })
  } catch (err) {
    console.error('[account] failed:', err)
    res.status(500).json({ error: 'account save failed' })
  }
})

// ---- WhatsApp inbound webhook: verify-by-message (no OTP) --------------------
// Where the "log in with WhatsApp" loop closes. When a parent sends our Business
// number the linking message, Meta POSTs it here. WhatsApp has already verified
// the sender, so `from` is a trusted number and `[code]` ties it to the guest
// session — we claim the account and never send an OTP. Mock-safe: with no
// credentials this still records the parent so the flow is exercisable locally.
app.post('/api/whatsapp/inbound', async (req, res) => {
  const b = req.body ?? {}
  // shape mirrors the Cloud API payload we care about (flattened for the demo)
  const from = normalizePhone(String(b.from ?? b.wa_id ?? ''))
  const profileName = String(b.name ?? b.profileName ?? 'Parent').trim() || 'Parent'
  const text = String(b.text ?? b.message ?? '')
  const code = (text.match(/\[(PP-[A-Z0-9]+)\]/) ?? [])[1] ?? null
  if (!from) return res.status(400).json({ error: 'missing verified sender' })
  try {
    // WhatsApp identifies the parent by their verified number. Real build ties
    // `code` back to the exact guest session; here we find-or-create by phone.
    const store = await getStore()
    const existing = await store.getParentByPhone(from)
    if (existing) {
      await store.upsertParent({ id: existing.id, name: profileName, phone: from, channel: 'whatsapp', claimed: true })
      res.json({ ok: true, verified: from, code, parentId: existing.id })
    } else {
      const parentId = `p_${randomUUID()}`
      await store.createParent({ id: parentId, name: profileName, phone: from, channel: 'whatsapp', claimed: true })
      res.json({ ok: true, verified: from, code, parentId, created: true })
    }
  } catch (err) {
    console.error('[whatsapp inbound] failed:', err)
    res.status(500).json({ error: 'inbound handling failed' })
  }
})

// ---- Prediction vs. actual: the trust engine ----

async function accuracyPayload(childId: string) {
  const store = await getStore()
  const predictions = await store.getPredictions(childId)
  const exams = await store.getExamResults(childId)
  const resolved = resolvePredictions(predictions, exams)
  const calibration = calibrationFrom(resolved)
  const readiness = computeReport(await store.getEngineInput(childId, Date.now())).readinessPct
  return {
    stats: accuracyStats(resolved),
    resolved,
    calibration,
    readiness,
    currentBand: predictBand(readiness, calibration),
  }
}

app.get('/api/accuracy/:childId', requireAuth, async (req, res) => {
  if (!(await ownsChild(res, req.params.childId))) return res.status(404).json({ error: 'child not found' })
  res.json(await accuracyPayload(req.params.childId))
})

// Snapshot a prediction now, so we can honestly check it against real marks later.
app.post('/api/predictions', requireAuth, async (req, res) => {
  const b = req.body ?? {}
  const childId = String(b.childId ?? '')
  if (!(await ownsChild(res, childId))) return res.status(404).json({ error: 'child not found' })
  const store = await getStore()
  const now = Date.now()
  const readiness = computeReport(await store.getEngineInput(childId, now)).readinessPct
  const cal = calibrationFrom(resolvePredictions(await store.getPredictions(childId), await store.getExamResults(childId)))
  const band = predictBand(readiness, cal)
  const prediction = {
    childId,
    subject: String(b.subject ?? 'Maths'),
    examType: String(b.examType ?? 'school_ut'),
    point: band.point,
    low: band.low,
    high: band.high,
    basisReadiness: readiness,
    madeAt: now,
  }
  const id = await store.addPrediction(prediction)
  res.json({ id, prediction })
})

// Parent enters the child's real exam marks — resolves the matching prediction.
app.post('/api/exams', requireAuth, async (req, res) => {
  const b = req.body ?? {}
  const childId = String(b.childId ?? '')
  const marks = Number(b.marks)
  if (!(await ownsChild(res, childId))) return res.status(404).json({ error: 'child not found' })
  const store = await getStore()
  if (!Number.isFinite(marks) || marks < 0 || marks > 100) return res.status(400).json({ error: 'marks must be 0-100' })
  await store.addExamResult({
    childId,
    subject: String(b.subject ?? 'Maths'),
    examType: String(b.examType ?? 'school_ut'),
    marks,
    date: typeof b.date === 'number' ? b.date : Date.now(),
  })
  res.json(await accuracyPayload(childId))
})

app.post('/api/send-card', async (req, res) => {
  const b = req.body ?? {}
  const card = b.card as CardCopy | undefined
  if (!card?.headline || !card?.body || !card?.actionTonight) {
    return res.status(400).json({ error: 'missing card' })
  }
  try {
    const result = await sendCard({
      card,
      phone: b.phone,
      ctx: {
        childName: String(b.childName ?? 'your child'),
        subject: b.subject,
        chapter: b.chapter,
        readinessPct: typeof b.readinessPct === 'number' ? b.readinessPct : undefined,
        ctaUrl: b.ctaUrl,
      },
    })
    res.json(result)
  } catch (err) {
    console.error('[send-card] failed:', err)
    res.status(500).json({ error: 'send failed' })
  }
})

app.listen(PORT, () => {
  const env = credsFromEnv()
  console.log(
    `ParentProof API on :${PORT} — llm=${env ? env.provider : 'mock'} · whatsapp=${hasWhatsApp() ? 'live' : 'mock'} · db=${storeKind}`,
  )
})
