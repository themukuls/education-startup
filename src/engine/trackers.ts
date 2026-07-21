// Layer 3 — cross-cutting trackers (spec §4).
// Velocity, exam-skill profile, consistency index, stamina curve, speed.

import type { ChapterLedger, EnrichedAnswer, Format, SessionEvent } from './types'
import { computeCells, computeChapterLedgers, blueprintReadinessPct } from './ledger'
import { WEEK_MS, FLOORS } from './seeds'

/** Ordinary-least-squares slope of y over x = [0,1,2,...]. */
function olsSlope(ys: number[]): number {
  const n = ys.length
  if (n < 2) return 0
  const xMean = (n - 1) / 2
  const yMean = ys.reduce((s, y) => s + y, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (ys[i] - yMean)
    den += (i - xMean) ** 2
  }
  return den ? num / den : 0
}

/**
 * Trailing weekly readiness values (oldest→newest). Each week's value is the
 * blueprint-weighted readiness computed from answers up to the end of that week.
 */
export function weeklyReadiness(answers: EnrichedAnswer[], asOf: number, weeks = 4): number[] {
  const values: number[] = []
  for (let w = weeks - 1; w >= 0; w--) {
    const weekEnd = asOf - w * WEEK_MS
    const upTo = answers.filter((a) => a.timestamp <= weekEnd)
    if (!upTo.length) {
      values.push(NaN)
      continue
    }
    const cells = computeCells(upTo, weekEnd)
    const ledgers = computeChapterLedgers(cells, upTo, weekEnd)
    values.push(blueprintReadinessPct(ledgers))
  }
  return values.filter((v) => !Number.isNaN(v))
}

export interface VelocityResult {
  ptsPerWeek: number | null
  band: 'rising' | 'holding' | 'slipping' | null
}

export function computeVelocity(answers: EnrichedAnswer[], asOf: number): VelocityResult {
  const vals = weeklyReadiness(answers, asOf, 4)
  if (vals.length < FLOORS.minWeeksForVelocity) return { ptsPerWeek: null, band: null }
  const slope = olsSlope(vals) // already in readiness points (0-100)
  const band = slope >= 2 ? 'rising' : slope < -1 ? 'slipping' : 'holding'
  return { ptsPerWeek: Math.round(slope * 10) / 10, band }
}

// ---- Consistency (§4.3) ----

export interface ConsistencyResult {
  index: number
  band: 'steady' | 'irregular' | 'cramming'
  completionRate: number
}

export function computeConsistency(sessions: SessionEvent[], asOf: number): ConsistencyResult {
  const recent = sessions.filter((s) => s.assignedAt >= asOf - 6 * WEEK_MS)
  const assigned = recent.length || 1
  const completed = recent.filter((s) => s.completed).length
  const completionRate = completed / assigned

  // cadence entropy: normalized variance of inter-session gaps.
  const times = recent
    .filter((s) => s.completed)
    .map((s) => s.assignedAt)
    .sort((a, b) => a - b)
  let cadenceEntropy = 0
  if (times.length >= 3) {
    const gaps: number[] = []
    for (let i = 1; i < times.length; i++) gaps.push((times[i] - times[i - 1]) / WEEK_MS)
    const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length
    const variance = gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length
    // normalise: a regular weekly cadence → ~0; erratic → →1
    cadenceEntropy = Math.min(1, variance / (mean * mean + 1e-6))
  }

  const index = 0.6 * completionRate + 0.4 * (1 - cadenceEntropy)
  const band = index >= 0.75 ? 'steady' : index >= 0.45 ? 'irregular' : 'cramming'
  return { index, band, completionRate }
}

// ---- Stamina (§4.4) ----

export interface StaminaResult {
  fadePts: number | null
  fades: boolean
}

export function computeStamina(answers: EnrichedAnswer[]): StaminaResult {
  const early = answers.filter((a) => a.position <= 3)
  const late = answers.filter((a) => a.position >= 8)
  if (early.length < 3 || late.length < 3) return { fadePts: null, fades: false }
  const earlyAcc = early.filter((a) => a.correct).length / early.length
  const lateAcc = late.filter((a) => a.correct).length / late.length
  const fadePts = Math.round((earlyAcc - lateAcc) * 100)
  return { fadePts, fades: fadePts >= 25 }
}

// ---- Exam-skill profile (§4.2) ----

export interface FormatSkill {
  format: Format
  accuracy: number
  attempts: number
  belowMean: boolean
}

export function computeExamSkill(answers: EnrichedAnswer[]): FormatSkill[] {
  const byFormat = new Map<Format, { correct: number; total: number }>()
  for (const a of answers) {
    const cur = byFormat.get(a.format) ?? { correct: 0, total: 0 }
    cur.correct += a.correct ? 1 : 0
    cur.total += 1
    byFormat.set(a.format, cur)
  }
  const skills: FormatSkill[] = []
  for (const [format, v] of byFormat) {
    if (v.total < FLOORS.minAttemptsPerFormat) continue
    skills.push({ format, accuracy: v.correct / v.total, attempts: v.total, belowMean: false })
  }
  if (skills.length) {
    const mean = skills.reduce((s, f) => s + f.accuracy, 0) / skills.length
    for (const f of skills) f.belowMean = f.accuracy <= mean - 0.2 // ≥20 pts below own mean
  }
  return skills
}

// ---- Speed ----

export function medianSpeedRatio(answers: EnrichedAnswer[]): number | null {
  if (!answers.length) return null
  const rs = answers.map((a) => a.speedRatio).sort((a, b) => a - b)
  const mid = Math.floor(rs.length / 2)
  return rs.length % 2 ? rs[mid] : (rs[mid - 1] + rs[mid]) / 2
}

/** Average seconds per question — a human-readable evidence number. */
export function avgSecondsPerQuestion(answers: EnrichedAnswer[]): number {
  if (!answers.length) return 0
  return Math.round(answers.reduce((s, a) => s + a.responseTimeSec, 0) / answers.length)
}

// re-export so ratings.ts has one import surface
export type { ChapterLedger }
