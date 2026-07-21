// Prose rendering — the second LLM job. Turns the engine's CHOSEN insight into
// a warm, parent-facing card under the template contract. The model never
// invents a number or a claim; the guardrail (checkCard) enforces that, and any
// violation falls back to the engine's own safe strings.

import Anthropic from '@anthropic-ai/sdk'
import {
  allowedNumbers,
  checkCard,
  fallbackCard,
  type CardCopy,
  type RenderRequest,
} from '../src/shared/card.ts'
import { hasKey } from './generate.ts'

const MODEL = 'claude-opus-4-8'

let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

function extractJson(text: string): Record<string, unknown> {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fence ? fence[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('no JSON object in model response')
  return JSON.parse(body.slice(start, end + 1))
}

function textOf(res: Anthropic.Message): string {
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
}

const RENDER_SYSTEM = `You are ParentProof's copywriter. You turn a diagnostic finding about a child's learning into one short, warm card a parent reads on their phone. You are given the finding already written plainly — your job is to make it human, not to add analysis.

Hard rules:
- Describe BEHAVIOUR, never ability. NEVER use: intelligent, smart, IQ, talent, gifted, lazy, careless, weak, behind, failing, "slow learner", "bad at". A child is never shamed.
- Use mechanism verbs: rushing, fading, mixing up, skipping steps, forgetting.
- Use ONLY numbers that appear in the input. Do NOT introduce any new statistic or figure. The parent card ("headline" + "body") may contain at most TWO numbers total.
- "actionTonight" is ONE thing a parent can do tonight in under 10 minutes.
- "ourSide" says what the app will do automatically next.
- "kidLine" is the same finding for the child — encouraging and gamified (a streak/points frame), one short line, an emoji is fine.
Return ONLY JSON: {"headline","body","actionTonight","ourSide","kidLine"}.`

function buildPrompt(req: RenderRequest): string {
  return `Finding (already plain): ${req.finding}
Detail / evidence: ${req.detail}
Suggested action: ${req.actionTonight}
Child: ${req.childName} · Subject: ${req.subject} · Chapter: ${req.chapter} · Tone: ${req.polarity}

Rewrite this as the card JSON now.`
}

async function callRender(req: RenderRequest, stricter: boolean): Promise<CardCopy> {
  const extra = stricter
    ? '\n\nYour previous attempt broke a rule (a banned word or an invented number). Re-do it: reuse ONLY the numbers in the input, and avoid every banned word.'
    : ''
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1500,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    system: RENDER_SYSTEM + extra,
    messages: [{ role: 'user', content: buildPrompt(req) }],
  } as unknown as Anthropic.MessageCreateParamsNonStreaming)

  const j = extractJson(textOf(res))
  return {
    headline: String(j.headline ?? ''),
    body: String(j.body ?? ''),
    actionTonight: String(j.actionTonight ?? ''),
    ourSide: String(j.ourSide ?? ''),
    kidLine: String(j.kidLine ?? ''),
  }
}

/** Render a card, guardrailed, with one retry then a safe fallback. */
export async function renderCard(req: RenderRequest): Promise<{ card: CardCopy; source: 'llm' | 'mock' | 'fallback' }> {
  if (!hasKey()) return { card: fallbackCard(req), source: 'mock' }

  const allowed = allowedNumbers(req)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const card = await callRender(req, attempt > 0)
      const reason = checkCard(card, allowed)
      if (!reason) return { card, source: 'llm' }
      console.warn(`[render] attempt ${attempt + 1} rejected: ${reason}`)
    } catch (err) {
      console.warn(`[render] attempt ${attempt + 1} errored:`, err)
    }
  }
  // guardrail never satisfied → ship the engine's own safe copy
  return { card: fallbackCard(req), source: 'fallback' }
}
