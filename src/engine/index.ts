// ParentProof learning-tracker engine — public entry point.
//
// computeReport(input) runs the full deterministic pipeline:
//   raw events → enrichment → skill ledger → cross-cutting trackers
//   → 5 ratings → insight selection
// and returns a LearningReport. No I/O, no randomness, no LLM. Every
// parent-facing number originates here (design contract §0).

import type { EngineInput, LearningReport, RatingKey } from './types'
import { enrichAnswers, provisionalCellReadiness } from './enrich'
import { computeCells, computeChapterLedgers, cellReadinessMap, blueprintReadinessPct } from './ledger'
import {
  computeVelocity,
  computeConsistency,
  computeStamina,
  computeExamSkill,
  weeklyReadiness,
} from './trackers'
import { computeRatings } from './ratings'
import { selectHeadline } from './insights'
import { FLOORS } from './seeds'

export * from './types'
export * from './accuracy'
export { FLOORS } from './seeds'

export function computeReport(input: EngineInput, recentHeadlines?: string[]): LearningReport {
  const { answers, sessions, exams, asOf, childId } = input
  void exams // reserved for prediction-vs-actual (Phase 2)

  // Layer 1 — enrichment. Two-pass: provisional readiness seeds error classes.
  const provisional = provisionalCellReadiness(answers)
  const enrichedFirst = enrichAnswers(answers, provisional)

  // Layer 2 — ledger (recency-weighted, LUCKY excluded), then re-enrich with it.
  const cells0 = computeCells(enrichedFirst, asOf)
  const enriched = enrichAnswers(answers, cellReadinessMap(cells0))
  const cells = computeCells(enriched, asOf)
  const ledgers = computeChapterLedgers(cells, enriched, asOf)
  const readinessPct = blueprintReadinessPct(ledgers)

  // Layer 3 — trackers.
  const velocity = computeVelocity(enriched, asOf)
  const consistency = computeConsistency(sessions, asOf)
  const stamina = computeStamina(enriched)
  const examSkill = computeExamSkill(enriched)

  // Ratings.
  const testsTaken = new Set(sessions.filter((s) => s.completed).map((s) => s.sessionId)).size
  const ratings = computeRatings({ readinessPct, ledgers, answers: enriched, sessions, asOf, testsTaken })

  // Insights — gated by the cold-start data floor (spec §6).
  const coldStart = testsTaken < FLOORS.minTestsForInsight
  const { headline, secondary } = coldStart
    ? { headline: null, secondary: [] }
    : selectHeadline({
        answers: enriched,
        ledgers,
        velocity,
        consistency,
        stamina,
        examSkill,
        testsTaken,
        recentHeadlines,
      })

  return {
    childId,
    asOf,
    testsTaken,
    ratings: ratings as Record<RatingKey, LearningReport['ratings'][RatingKey]>,
    chapters: ledgers,
    readinessPct,
    velocityPtsPerWeek: velocity.ptsPerWeek,
    velocityBand: velocity.band,
    trajectory: weeklyReadiness(enriched, asOf, 4),
    headline,
    secondary,
    coldStart,
  }
}
