// The Insight Selector v1 (spec §5) — a rules engine, deliberately zero ML.
// Emits weekly candidates, scores them z × A × N, and picks one headline under
// the praise-cadence and escalation constraints. The LLM later renders prose
// around the CHOSEN candidate; it never invents the finding or the numbers.

import type { EnrichedAnswer, InsightCandidate, ChapterLedger } from './types'
import type { VelocityResult, ConsistencyResult, StaminaResult, FormatSkill } from './trackers'
import { ACTIONABILITY, FLOORS } from './seeds'

export interface InsightInput {
  answers: EnrichedAnswer[]
  ledgers: ChapterLedger[]
  velocity: VelocityResult
  consistency: ConsistencyResult
  stamina: StaminaResult
  examSkill: FormatSkill[]
  testsTaken: number
  /** headline metric keys from the last few weeks (for novelty + praise guard). */
  recentHeadlines?: string[]
  /** was velocity slipping last week too? (escalation trigger) */
  slippingStreak?: number
}

function novelty(metric: string, recent: string[] | undefined): number {
  return recent && recent.includes(metric) ? 0.3 : 1
}

export function generateCandidates(input: InsightInput): InsightCandidate[] {
  const cands: InsightCandidate[] = []
  const errors = input.answers.filter((a) => !a.correct)
  const push = (
    metric: string,
    polarity: 'positive' | 'negative',
    z: number,
    headline: string,
    detail: string,
    actionTonight: string,
  ) => {
    const A = ACTIONABILITY[metric] ?? 0.4
    const N = novelty(metric, input.recentHeadlines)
    cands.push({ metric, polarity, z, actionability: A, novelty: N, score: z * A * N, headline, detail, actionTonight })
  }

  // CARELESS pattern — highest actionability.
  if (errors.length >= FLOORS.minErrorsForClassClaims) {
    const careless = errors.filter((a) => a.errorClass === 'CARELESS').length
    const share = careless / errors.length
    if (share >= 0.4) {
      push(
        'careless',
        'negative',
        share, // z proxy: share of errors that were avoidable
        `Their #1 mark-loser this month: speed, not knowledge.`,
        `${careless} of ${errors.length} errors were on questions they knew — answered in under half the normal time.`,
        `Before the next test, ask them to read each question twice before choosing an option.`,
      )
    }
  }

  // Rote gap.
  const rote = input.ledgers.find((l) => l.roteFlag === 'ROTE')
  if (rote && rote.roteGap != null) {
    push(
      'rote_gap',
      'negative',
      rote.roteGap,
      `${rote.chapter}: memorised, not understood.`,
      `Strong on recall but drops on questions that need applying it.`,
      `Ask them to explain ${rote.chapter} in their own words — no formula, just the idea.`,
    )
  }

  // Decay.
  const fading = input.ledgers.find((l) => l.retentionBand === 'fast_fading')
  if (fading && fading.retentionRatio != null) {
    push(
      'decay',
      'negative',
      1 - fading.retentionRatio,
      `${fading.chapter} is fading.`,
      `Aced earlier, tested lower this week — normal forgetting, worth a refresh.`,
      `Nothing tonight — the next test folds in a short ${fading.chapter} refresher.`,
    )
  }

  // Format weakness.
  const weakFormat = input.examSkill.find((f) => f.belowMean)
  if (weakFormat) {
    push(
      'format_weakness',
      'negative',
      0.5,
      `Loses marks on ${weakFormat.format} questions.`,
      `Knows the material but underperforms on this question type.`,
      `Practise two ${weakFormat.format} questions together tonight — pace, not new content.`,
    )
  }

  // Slipping velocity.
  if (input.velocity.band === 'slipping' && input.velocity.ptsPerWeek != null) {
    push(
      'slipping_velocity',
      'negative',
      Math.abs(input.velocity.ptsPerWeek),
      `Readiness has slipped two weeks running.`,
      `Down ${Math.abs(input.velocity.ptsPerWeek)} points/week — worth catching now.`,
      `Sit with them for the next test and watch where the time goes.`,
    )
  }

  // Stamina.
  if (input.stamina.fades && input.stamina.fadePts != null) {
    push(
      'stamina',
      'negative',
      input.stamina.fadePts / 100,
      `Strong start, fades late.`,
      `Accuracy drops ${input.stamina.fadePts} points by the last questions.`,
      `Try one slightly longer practice set so the finish feels routine.`,
    )
  }

  // Consistency drop.
  if (input.consistency.band !== 'steady') {
    push(
      'consistency_drop',
      'negative',
      1 - input.consistency.index,
      `Test rhythm is uneven.`,
      `Fewer, bunched-up tests make the trend harder to trust.`,
      `Pick a fixed test night — same day each week beats cramming.`,
    )
  }

  // Retention praise (positive).
  const strong = input.ledgers.find((l) => l.retentionBand === 'strong')
  if (strong) {
    push(
      'retention_praise',
      'positive',
      0.5,
      `${strong.chapter} is sticking.`,
      `What they learned weeks ago still tests strong — that's real understanding.`,
      `Tell them you noticed ${strong.chapter} held up. Name the win.`,
    )
  }

  return cands.sort((a, b) => b.score - a.score)
}

/**
 * Pick the weekly headline (spec §5.2). Constraints:
 * - escalation override: consistency < 0.45 or 2-week slipping always wins;
 * - praise-cadence guard: if the last 2 headlines were negative, force the
 *   best positive candidate this week.
 */
export function selectHeadline(input: InsightInput): {
  headline: InsightCandidate | null
  secondary: InsightCandidate[]
} {
  const cands = generateCandidates(input)
  if (!cands.length) return { headline: null, secondary: [] }

  // Escalation override.
  const escalation = cands.find(
    (c) =>
      (c.metric === 'consistency_drop' && input.consistency.index < 0.45) ||
      (c.metric === 'slipping_velocity' && (input.slippingStreak ?? 0) >= 2),
  )
  if (escalation) {
    return { headline: escalation, secondary: cands.filter((c) => c !== escalation).slice(0, 3) }
  }

  // Praise-cadence guard.
  const lastTwo = (input.recentHeadlines ?? []).slice(-2)
  const lastTwoNegative =
    lastTwo.length === 2 && lastTwo.every((m) => !m.includes('praise'))
  if (lastTwoNegative) {
    const positive = cands.find((c) => c.polarity === 'positive')
    if (positive) {
      return { headline: positive, secondary: cands.filter((c) => c !== positive).slice(0, 3) }
    }
  }

  return { headline: cands[0], secondary: cands.slice(1, 4) }
}
