// Prose rendering — the second LLM job, provider-agnostic. Turns the engine's
// CHOSEN insight into a warm, parent-facing card under the template contract.
// The model never invents a number or a claim; the guardrail (checkCard)
// enforces that, and any violation falls back to the engine's own safe strings —
// identically whichever provider produced the prose.

import { llmJson, type LlmCreds } from './llm/index.ts'
import {
  allowedNumbers,
  checkCard,
  fallbackCard,
  type CardCopy,
  type RenderRequest,
} from '../src/shared/card.ts'

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

async function callRender(creds: LlmCreds, req: RenderRequest, stricter: boolean): Promise<CardCopy> {
  const extra = stricter
    ? '\n\nYour previous attempt broke a rule (a banned word or an invented number). Re-do it: reuse ONLY the numbers in the input, and avoid every banned word.'
    : ''
  const j = await llmJson<Record<string, unknown>>(creds, {
    system: RENDER_SYSTEM + extra,
    user: buildPrompt(req),
    maxTokens: 1500,
    temperature: 0.6,
  })
  return {
    headline: String(j.headline ?? ''),
    body: String(j.body ?? ''),
    actionTonight: String(j.actionTonight ?? ''),
    ourSide: String(j.ourSide ?? ''),
    kidLine: String(j.kidLine ?? ''),
  }
}

/** Render a card, guardrailed, with one retry then a safe fallback. */
export async function renderCard(
  req: RenderRequest,
  creds: LlmCreds | null,
): Promise<{ card: CardCopy; source: 'llm' | 'mock' | 'fallback' }> {
  if (!creds) return { card: fallbackCard(req), source: 'mock' }

  const allowed = allowedNumbers(req)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const card = await callRender(creds, req, attempt > 0)
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
