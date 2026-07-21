// ParentProof API server — holds the Anthropic key and exposes question
// generation. Runs in mock mode automatically when no key is present.

import express from 'express'
import cors from 'cors'
import { generateTest, hasKey } from './generate.ts'
import { renderCard } from './render.ts'
import { sendCard, hasWhatsApp } from './whatsapp.ts'
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
