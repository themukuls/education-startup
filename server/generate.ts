// Question generation — the LLM layer.
//
// With an API key: claude-opus-4-8 generates syllabus-mapped items under a
// structured-output schema, then a SECOND independent pass re-solves each item
// and drops any whose marked answer it can't confirm (answer-key verification —
// a wrong key must never reach a child). Without a key: a deterministic mock so
// the whole app + integration path still runs.

import Anthropic from '@anthropic-ai/sdk'
import {
  GENERATION_SCHEMA,
  validateItems,
  type GeneratedItem,
  type GenerateRequest,
} from '../src/shared/quiz'
import { auditQuestions } from '../src/data/testQuestions'

const MODEL = 'claude-opus-4-8'

export function hasKey(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
}

let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic() // resolves key from env
  return client
}

/** Defensively pull a JSON object out of a model text response. */
function extractJson(text: string): { questions?: unknown[]; answers?: unknown[] } {
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
Return ONLY a JSON object of the form {"questions":[...]}. No prose.`

function buildGenPrompt(req: GenerateRequest): string {
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
- Cognitive mix: ${mix}

Return the JSON object now.`
}

/** Generation call. Returns items that pass the structural guardrail. */
export async function generateWithClaude(req: GenerateRequest): Promise<GeneratedItem[]> {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 8000,
    // adaptive thinking + high effort: question quality is the moat
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_schema', schema: GENERATION_SCHEMA }, effort: 'high' },
    system: GEN_SYSTEM,
    messages: [{ role: 'user', content: buildGenPrompt(req) }],
    // cast: output_config typing varies across SDK minor versions; the runtime
    // accepts it and we parse defensively regardless.
  } as unknown as Anthropic.MessageCreateParamsNonStreaming)

  const parsed = extractJson(textOf(res))
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
export async function verifyAnswers(items: GeneratedItem[]): Promise<GeneratedItem[]> {
  if (!items.length) return items
  const blind = items.map((q, i) => ({ i, prompt: q.prompt, options: q.options }))
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high' },
    system: VERIFY_SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(blind) }],
  } as unknown as Anthropic.MessageCreateParamsNonStreaming)

  let answers: { index: number; confident: boolean }[] = []
  try {
    const parsed = extractJson(textOf(res))
    answers = Array.isArray(parsed.answers) ? (parsed.answers as typeof answers) : []
  } catch {
    // if verification output is unparseable, fail safe: keep nothing rather than
    // ship unverified keys
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

// ---- Mock (no API key) ----

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

/** Full pipeline: generate → verify → validated items (or mock). */
export async function generateTest(req: GenerateRequest): Promise<{ items: GeneratedItem[]; source: 'llm' | 'mock' }> {
  if (!hasKey()) return { items: mockGenerate(req), source: 'mock' }

  let items = await generateWithClaude(req)
  // one retry if the guardrail left us short
  if (items.length < req.count) {
    const more = await generateWithClaude({ ...req, count: req.count - items.length })
    items = [...items, ...more]
  }
  items = await verifyAnswers(items)
  return { items: items.slice(0, req.count), source: 'llm' }
}
