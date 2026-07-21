// Layer 1 — per-question enrichment (spec §2).
// Speed ratio, error classification, and the LUCKY anti-noise flag.

import type { AnswerEvent, EnrichedAnswer, ErrorClass } from './types'
import { expectedResponseTime } from './seeds'

/** Key a cell by chapter + cognitive level. */
export function cellKey(chapter: string, cog: string): string {
  return `${chapter}::${cog}`
}

/**
 * Classify a WRONG answer into a mechanism (spec §2.2). Precedence follows the
 * spec table top-to-bottom. STAMINA is inherently cross-session, so it's applied
 * later in the trackers layer rather than here.
 */
function classifyError(
  a: AnswerEvent,
  speedRatio: number,
  cellReadiness: number,
): ErrorClass {
  // CARELESS — knew it, rushed it.
  if (speedRatio < 0.6 && a.itemDifficulty < 0.4 && cellReadiness >= 0.65) {
    return 'CARELESS'
  }
  // CONCEPT_GAP — genuinely doesn't know.
  if (speedRatio >= 0.8 && cellReadiness < 0.5) {
    return 'CONCEPT_GAP'
  }
  // GUESS — didn't engage, punted.
  if (speedRatio < 0.5 && a.itemDifficulty >= 0.5) {
    return 'GUESS'
  }
  // SHAKY — half-knows; first instinct often right.
  if (a.answerChanged && cellReadiness >= 0.4 && cellReadiness <= 0.7) {
    return 'SHAKY'
  }
  return 'UNCLASSIFIED'
}

/**
 * Enrich every answer. `cellReadiness` maps a cellKey → provisional readiness
 * (0-1) used only for error classification; the final ledger recomputes
 * readiness excluding LUCKY answers.
 */
export function enrichAnswers(
  answers: AnswerEvent[],
  cellReadiness: Map<string, number>,
): EnrichedAnswer[] {
  return answers.map((a) => {
    const expected = expectedResponseTime(a.format, a.cogLevel)
    const speedRatio = expected > 0 ? a.responseTimeSec / expected : 1
    const readiness = cellReadiness.get(cellKey(a.chapter, a.cogLevel)) ?? 0.5

    const lucky = a.correct && speedRatio < 0.4 && a.itemDifficulty >= 0.6
    const errorClass = a.correct ? null : classifyError(a, speedRatio, readiness)

    return { ...a, speedRatio, errorClass, lucky }
  })
}

/**
 * Provisional cell readiness from raw correctness (unweighted mean). Used to
 * seed error classification before the recency-weighted ledger runs.
 */
export function provisionalCellReadiness(answers: AnswerEvent[]): Map<string, number> {
  const agg = new Map<string, { correct: number; total: number }>()
  for (const a of answers) {
    const k = cellKey(a.chapter, a.cogLevel)
    const cur = agg.get(k) ?? { correct: 0, total: 0 }
    cur.correct += a.correct ? 1 : 0
    cur.total += 1
    agg.set(k, cur)
  }
  const out = new Map<string, number>()
  for (const [k, v] of agg) out.set(k, v.total ? v.correct / v.total : 0.5)
  return out
}
