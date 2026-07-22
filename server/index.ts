// ParentProof API server — holds the Anthropic key and exposes question
// generation. Runs in mock mode automatically when no key is present.

import express from 'express'
import cors from 'cors'
import { randomUUID } from 'node:crypto'
import { generateTest, hasKey } from './generate.ts'
import { renderCard } from './render.ts'
import { sendCard, hasWhatsApp } from './whatsapp.ts'
import { getStore } from './db/index.ts'
import { computeReport } from '../src/engine/index.ts'
import type { AnswerEvent } from '../src/engine/types.ts'
import { toQuestions, type GenerateRequest } from '../src/shared/quiz.ts'
import type { RenderRequest, CardCopy } from '../src/shared/card.ts'

const app = express()
app.use(cors())
app.use(express.json({ limit: '256kb' }))

const PORT = Number(process.env.PORT ?? 8787)

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    llm: hasKey() ? 'llm' : 'mock',
    whatsapp: hasWhatsApp() ? 'live' : 'mock',
    db: 'sqlite',
    model: 'claude-opus-4-8',
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
    const { items, source } = await generateTest(request)
    if (!items.length) {
      return res.status(502).json({ error: 'no valid questions produced', source })
    }
    const questions = toQuestions(items, request.subject, request.chapter)
    res.json({ questions, source, meta: { requested: request.count, delivered: questions.length } })
  } catch (err) {
    console.error('[generate-test] failed:', err)
    res.status(500).json({ error: 'generation failed' })
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
    const { card, source } = await renderCard(request)
    res.json({ card, source })
  } catch (err) {
    console.error('[render-card] failed:', err)
    res.status(500).json({ error: 'render failed' })
  }
})

// ---- Persistence: a child's real learning record ----

app.get('/api/child/:childId', (req, res) => {
  const child = getStore().getChild(req.params.childId)
  if (!child) return res.status(404).json({ error: 'child not found' })
  res.json(child)
})

// Compute the report from the child's STORED event history (not synthetic data).
app.get('/api/report/:childId', (req, res) => {
  const store = getStore()
  if (!store.getChild(req.params.childId)) return res.status(404).json({ error: 'child not found' })
  try {
    const input = store.getEngineInput(req.params.childId, Date.now())
    res.json(computeReport(input))
  } catch (err) {
    console.error('[report] failed:', err)
    res.status(500).json({ error: 'report failed' })
  }
})

// Record a completed test: persist the session + its answers, then return the
// recomputed report so the child's profile updates immediately.
app.post('/api/sessions', (req, res) => {
  const b = req.body ?? {}
  const childId = String(b.childId ?? '')
  const raw = Array.isArray(b.answers) ? b.answers : []
  if (!childId || raw.length === 0) return res.status(400).json({ error: 'childId and answers required' })

  const store = getStore()
  if (!store.getChild(childId)) return res.status(404).json({ error: 'child not found' })

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
    store.addSession({ sessionId, childId, type: 'weekly', assignedAt: now, completed: true, abandonedAtQ: null })
    store.addAnswers(answers)
    const report = computeReport(store.getEngineInput(childId, Date.now()))
    res.json({ ok: true, sessionId, report })
  } catch (err) {
    console.error('[sessions] failed:', err)
    res.status(500).json({ error: 'save failed' })
  }
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
  console.log(
    `ParentProof API on :${PORT} — llm=${hasKey() ? 'claude-opus-4-8' : 'mock'} · whatsapp=${hasWhatsApp() ? 'live' : 'mock'}`,
  )
})
