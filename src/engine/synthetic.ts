// Deterministic synthetic event generator — for tests and for seeding the app
// with realistic computed data before any real test exists. No Math.random:
// a seeded PRNG keeps the whole engine reproducible.

import type {
  AnswerEvent,
  CogLevel,
  EngineInput,
  Format,
  SessionEvent,
} from './types'
import { WEEK_MS } from './seeds'

function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Archetype = 'improver' | 'rusher' | 'crammer' | 'fader' | 'coldstart'

const CHAPTERS = ['Quadratics', 'Polynomials', 'Linear Equations', 'Trigonometry']
const COGS: CogLevel[] = ['R', 'U', 'A']

interface BuildOpts {
  childId?: string
  archetype: Archetype
  asOf: number
  weeks?: number
  seed?: number
}

export function buildStream(opts: BuildOpts): EngineInput {
  const { archetype, asOf } = opts
  const childId = opts.childId ?? 'child-1'
  const weeks = opts.weeks ?? (archetype === 'coldstart' ? 1 : 6)
  const rnd = mulberry32(opts.seed ?? 42)

  const answers: AnswerEvent[] = []
  const sessions: SessionEvent[] = []

  // base skill per chapter×cog, 0-1
  const skill: Record<string, number> = {}
  for (const ch of CHAPTERS) {
    for (const cog of COGS) {
      // Quadratics-Apply is the deliberate weak/rote cell
      let base = 0.55 + rnd() * 0.25
      if (ch === 'Quadratics' && cog === 'A') base = 0.35
      if (ch === 'Quadratics' && cog === 'R') base = 0.85 // recites, can't apply → rote gap
      skill[`${ch}:${cog}`] = base
    }
  }

  for (let w = 0; w < weeks; w++) {
    const weekIdx = weeks - 1 - w // 0 = oldest
    const ts = asOf - weekIdx * WEEK_MS

    // crammer completes only a few, bunched sessions (skips 3 middle weeks →
    // low completion + high gap variance → a genuine cramming pattern)
    const skip = archetype === 'crammer' && (weekIdx === 2 || weekIdx === 3 || weekIdx === 4)
    const sessionId = `${childId}-s${w}`
    sessions.push({
      sessionId,
      childId,
      type: 'weekly',
      assignedAt: ts,
      completed: !skip,
      abandonedAtQ: skip ? 2 : null,
    })
    if (skip) continue

    const nQ = 9
    for (let q = 1; q <= nQ; q++) {
      const ch = CHAPTERS[(q - 1) % CHAPTERS.length]
      const cog = COGS[(q - 1) % COGS.length]
      const format: Format = cog === 'A' ? 'NUM' : 'MCQ'
      const difficulty = 0.3 + rnd() * 0.5

      // improver: skill rises over weeks
      let p = skill[`${ch}:${cog}`]
      if (archetype === 'improver') p += (w / weeks) * 0.22
      p = Math.max(0.05, Math.min(0.97, p))

      let correct = rnd() < p
      const expected = cog === 'A' ? 120 : cog === 'R' ? 25 : 40
      let rt = expected * (0.7 + rnd() * 0.7)
      const answerChanged = rnd() < 0.15
      let itemDifficulty = difficulty

      // rusher: answers fast everywhere; on the first 3 (easy, well-known) items
      // slips a minority to speed → CARELESS, while the cell stays ≥0.65.
      if (archetype === 'rusher') {
        rt = expected * 0.42 // ρ ≈ 0.42 → rushing
        if (q <= 4) {
          itemDifficulty = 0.3 // easy, well-known
          // ~20% slip keeps the cell readiness ≥0.65 ("knew it") so the miss
          // classifies as CARELESS rather than a concept gap
          correct = rnd() > 0.2
        } else {
          // a rusher knows the material — most errors are the careless slips,
          // not concept gaps, so keep the harder items mostly correct
          correct = rnd() < 0.9
        }
      }

      // fader: late questions slip
      if (archetype === 'fader' && q >= 8 && rnd() < 0.6) correct = false

      answers.push({
        childId,
        itemId: `${sessionId}-q${q}`,
        chapter: ch,
        cogLevel: cog,
        format,
        itemDifficulty,
        correct,
        responseTimeSec: Math.round(rt),
        answerChanged,
        skipped: false,
        sessionId,
        timestamp: ts,
        position: q,
      })
    }
  }

  return { childId, asOf, answers, sessions, exams: [] }
}
