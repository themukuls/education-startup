// Seed constants — cohort baselines used before we have real cohort data.
// All values are lifted directly from the tracker spec so they're auditable.

import type { Format, CogLevel } from './types'

/**
 * Expected response time T̄ per (format, cogLevel), in seconds (spec §2.1).
 * MCQ scales by cognitive level; the rest are format-level seeds.
 */
export function expectedResponseTime(format: Format, cog: CogLevel): number {
  if (format === 'MCQ') {
    return cog === 'R' ? 25 : cog === 'U' ? 40 : 55
  }
  const byFormat: Record<Exclude<Format, 'MCQ'>, number> = {
    SA2: 90,
    SA3: 150,
    LA5: 240,
    NUM: 120,
    DIAG: 75,
  }
  return byFormat[format]
}

/** Recency weight for an answer: 0.85 ^ weeks_ago (spec §3.1). */
export function recencyWeight(weeksAgo: number): number {
  return Math.pow(0.85, Math.max(0, weeksAgo))
}

/** Bayesian prior strength for readiness (spec §3.1). */
export const READINESS_ALPHA = 3

/** Cohort-mean prior for a cell before we know better (spec §3.1, seeded 0.5). */
export const READINESS_PRIOR = 0.5

/** Default item difficulty before cohort data (spec §1). */
export const DEFAULT_DIFFICULTY = 0.5

/**
 * Exam Blueprint Matrix — board marks per chapter. A chapter worth more board
 * marks moves the weighted readiness more (spec §4.1), keeping the tracker
 * "exam-honest". Seeded for Class 10 CBSE Maths; unknown chapters default to 4.
 */
export const BLUEPRINT_WEIGHTS: Record<string, number> = {
  'Real Numbers': 4,
  Polynomials: 6,
  'Linear Equations': 6,
  Quadratics: 8,
  'Arithmetic Progressions': 6,
  Triangles: 8,
  Trigonometry: 10,
  Circles: 6,
  Statistics: 6,
  Probability: 4,
}

export function blueprintWeight(chapter: string): number {
  return BLUEPRINT_WEIGHTS[chapter] ?? 4
}

// ---- Data floors (spec §6 — non-negotiable) ----
export const FLOORS = {
  /** no error-class claims under this many errors. */
  minErrorsForClassClaims: 6,
  /** no velocity under this many weekly points. */
  minWeeksForVelocity: 3,
  /** no cell-level readiness claim under this many attempts. */
  minAttemptsForCell: 6,
  /** min attempts per format for the exam-skill profile. */
  minAttemptsPerFormat: 5,
  /** first insight headline only after this many tests. */
  minTestsForInsight: 3,
  /** rote gap needs at least this many R and U/A attempts. */
  minRForRote: 4,
  minUAForRote: 3,
} as const

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/** Actionability scores for the insight selector (spec §5.1). */
export const ACTIONABILITY: Record<string, number> = {
  careless: 1.0,
  rote_gap: 0.9,
  format_weakness: 0.9,
  decay: 0.85,
  slipping_velocity: 0.8,
  stamina: 0.7,
  consistency_drop: 0.7,
  concept_gap: 0.65,
  retention_praise: 0.5,
  prediction_move: 0.4,
  percentile_shift: 0.3,
}
