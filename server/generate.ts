// Question generation — the LLM layer, now provider-agnostic.
//
// With credentials (env, or BYOK headers from the frontend): the chosen model
// generates syllabus-mapped items, then a SECOND independent pass re-solves each
// item and drops any whose marked answer it can't confirm (answer-key
// verification — a wrong key must never reach a child). Without credentials: a
// deterministic mock so the whole app + integration path still runs.
//
// The provider is a detail; these guardrails are identical for Claude, GPT,
// Groq or Gemini, which is exactly what makes the provider swappable.

import { llmJson, hasEnvLlm, type LlmCreds } from './llm/index.ts'
import {
  validateItems,
  type GeneratedItem,
  type GenerateRequest,
} from '../src/shared/quiz.ts'
import { auditQuestions } from '../src/data/testQuestions.ts'

/** Back-compat: true when the SERVER env is configured (health/log). */
export function hasKey(): boolean {
  return hasEnvLlm()
}

const GEN_SYSTEM = `You are ParentProof's assessment author. You write short diagnostic questions that reveal what a student truly understands — not trivia, not trick questions.

Hard rules:
- Every question has EXACTLY 4 options and EXACTLY one unambiguously correct option.
- "answer" is the 0-based index of the correct option.
- Content must be accurate for the requested board, class and chapter, and match where that syllabus sits mid-year.
- Mix cognitive levels: R = recall a fact/formula, U = understand a concept, A = apply it to a problem.
- Distractors must be plausible wrong answers that each encode a specific, common misconception — never random or obviously wrong.
- "misconception" states, in one short clause, what choosing a wrong option reveals about the student's gap.
- "difficulty" is your estimate of the cohort error rate, 0 (trivial) to 1 (very hard).
- Use plain text for maths (x^2, sqrt, /, ×). No LaTeX, no images.
Return ONLY a JSON object of the form {"questions":[{"prompt","options":[4],"answer","cogLevel","format","difficulty","misconception"}, ...]}.`

function buildGenPrompt(req: GenerateRequest, grounding = ''): string {
  const mix = req.mix
    ? Object.entries(req.mix)
        .map(([k, v]) => `${v}×${k}`)
        .join(', ')
    : 'a balanced spread of R/U/A'
  return `Write ${req.count} questions for:
- Board: ${req.board}
- Class: ${req.klass}
- Subject: ${req.subject}
- Chapter: ${req.chapter}
- Cognitive mix: ${mix}${grounding}

Return the JSON object now.`
}

/** Generation call. Returns items that pass the structural guardrail. */
export async function generateWithProvider(creds: LlmCreds, req: GenerateRequest, grounding = ''): Promise<GeneratedItem[]> {
  const parsed = await llmJson<{ questions?: unknown[] }>(creds, {
    system: GEN_SYSTEM,
    user: buildGenPrompt(req, grounding),
    maxTokens: 8000,
  })
  const { valid, dropped } = validateItems(Array.isArray(parsed.questions) ? parsed.questions : [])
  if (dropped.length) console.warn(`[generate] dropped ${dropped.length} malformed item(s):`, dropped)
  return valid
}

const VERIFY_SYSTEM = `You are an independent answer checker. For each question you are given ONLY the prompt and its 4 options — NOT the intended answer. Solve each yourself and report the 0-based index you believe is correct, plus whether you are confident. Return ONLY {"answers":[{"index":<int>,"confident":<bool>}, ...]} in the same order.`

/**
 * Independent verification: re-solve every item blind and keep only those whose
 * marked answer the checker confirms with confidence. This is the guardrail that
 * stops a hallucinated answer key from reaching a kid.
 */
export async function verifyAnswers(creds: LlmCreds, items: GeneratedItem[]): Promise<GeneratedItem[]> {
  if (!items.length) return items
  const blind = items.map((q, i) => ({ i, prompt: q.prompt, options: q.options }))
  let answers: { index: number; confident: boolean }[] = []
  try {
    const parsed = await llmJson<{ answers?: { index: number; confident: boolean }[] }>(creds, {
      system: VERIFY_SYSTEM,
      user: JSON.stringify(blind),
      maxTokens: 4000,
    })
    answers = Array.isArray(parsed.answers) ? parsed.answers : []
  } catch {
    // if verification is unparseable, fail safe: keep nothing rather than ship
    // unverified keys
    console.warn('[verify] unparseable verification response — dropping batch')
    return []
  }

  return items.filter((q, i) => {
    const a = answers[i]
    const ok = a && a.confident && a.index === q.answer
    if (!ok) console.warn(`[verify] dropped item ${i}: checker=${a?.index}(conf ${a?.confident}) vs key=${q.answer}`)
    return ok
  })
}

// ---- Mock (no credentials) ----

/** Deterministic mock: reuse the vetted static bank as generated items. */
export function mockGenerate(req: GenerateRequest): GeneratedItem[] {
  return auditQuestions.slice(0, req.count).map((q) => ({
    prompt: q.prompt,
    options: q.options,
    answer: q.answer,
    cogLevel: q.skill,
    format: q.topic.toLowerCase().includes('quad') && q.skill === 'A' ? 'NUM' : 'MCQ',
    difficulty: 0.5,
    misconception: '',
  }))
}

/** Full pipeline: generate → verify → validated items (or mock when no creds).
 * `grounding` is optional retrieved syllabus context (RAG). */
export async function generateTest(
  req: GenerateRequest,
  creds: LlmCreds | null,
  grounding = '',
): Promise<{ items: GeneratedItem[]; source: 'llm' | 'mock'; provider?: string; grounded?: boolean }> {
  if (!creds) return { items: mockGenerate(req), source: 'mock', grounded: !!grounding }

  let items = await generateWithProvider(creds, req, grounding)
  // one retry if the guardrail left us short
  if (items.length < req.count) {
    const more = await generateWithProvider(creds, { ...req, count: req.count - items.length }, grounding)
    items = [...items, ...more]
  }
  items = await verifyAnswers(creds, items)
  return { items: items.slice(0, req.count), source: 'llm', provider: creds.provider, grounded: !!grounding }
}
