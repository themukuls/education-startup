// Prediction vs. actual — the trust engine (business plan §8).
//
// We snapshot a prediction (a band) when we make it, then — when a parent enters
// the child's real exam marks — check the prediction we ACTUALLY made against
// the actual. The published stat ("within ±8% for N% of exams") is computed
// only from resolved pairs, and we never hide a miss. Pure + deterministic.

/** The claim band published to parents (business plan: "within ±8%"). */
export const PUBLISHED_TOLERANCE = 8

export interface Calibration {
  /** mean signed error (actual − predicted point) over past resolved exams. */
  bias: number
  /** how many resolved exams the calibration is based on. */
  n: number
}

export interface PredictionBand {
  point: number
  low: number
  high: number
  halfWidth: number
}

export interface Prediction {
  id?: string
  childId: string
  subject: string
  examType: string
  point: number
  low: number
  high: number
  basisReadiness: number
  madeAt: number
}

export interface ExamResult {
  childId: string
  subject: string
  examType: string
  marks: number
  date: number
}

export interface ResolvedPrediction {
  prediction: Prediction
  actual: number
  date: number
  /** actual − predicted point (signed). */
  error: number
  absError: number
  /** actual fell inside the band we gave. */
  withinBand: boolean
  /** |error| ≤ the published ±8 tolerance (the marketing stat). */
  within8: boolean
}

export interface AccuracyStats {
  n: number
  within8: number
  within8Pct: number
  withinBand: number
  withinBandPct: number
  meanAbsError: number
  /** signed bias — feeds the next prediction's calibration. */
  bias: number
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))

/**
 * Turn a readiness score into a predicted marks band. Calibration shifts the
 * centre by our historical bias; with little history we widen the band
 * (under-claim early — spec's explicit instruction).
 */
export function predictBand(readiness: number, cal?: Calibration): PredictionBand {
  const bias = cal ? cal.bias : 0
  const point = clamp(Math.round(readiness + bias))
  // under-claim early: ±12 until we have ≥2 resolved exams, then tighten to ±8
  const halfWidth = cal && cal.n >= 2 ? PUBLISHED_TOLERANCE : 12
  return { point, low: clamp(point - halfWidth), high: clamp(point + halfWidth), halfWidth }
}

/**
 * Pair each exam with the most recent prediction MADE BEFORE IT for the same
 * subject + exam type. Only genuinely-predicted-then-observed pairs count.
 */
export function resolvePredictions(predictions: Prediction[], exams: ExamResult[]): ResolvedPrediction[] {
  const resolved: ResolvedPrediction[] = []
  for (const exam of exams) {
    const candidates = predictions
      .filter(
        (p) =>
          p.childId === exam.childId &&
          p.subject === exam.subject &&
          p.examType === exam.examType &&
          p.madeAt <= exam.date,
      )
      .sort((a, b) => b.madeAt - a.madeAt)
    const prediction = candidates[0]
    if (!prediction) continue
    const error = exam.marks - prediction.point
    resolved.push({
      prediction,
      actual: exam.marks,
      date: exam.date,
      error,
      absError: Math.abs(error),
      withinBand: exam.marks >= prediction.low && exam.marks <= prediction.high,
      within8: Math.abs(error) <= PUBLISHED_TOLERANCE,
    })
  }
  return resolved.sort((a, b) => a.date - b.date)
}

export function accuracyStats(resolved: ResolvedPrediction[]): AccuracyStats {
  const n = resolved.length
  if (n === 0) {
    return { n: 0, within8: 0, within8Pct: 0, withinBand: 0, withinBandPct: 0, meanAbsError: 0, bias: 0 }
  }
  const within8 = resolved.filter((r) => r.within8).length
  const withinBand = resolved.filter((r) => r.withinBand).length
  const meanAbsError = resolved.reduce((s, r) => s + r.absError, 0) / n
  const bias = resolved.reduce((s, r) => s + r.error, 0) / n
  return {
    n,
    within8,
    within8Pct: Math.round((within8 / n) * 100),
    withinBand,
    withinBandPct: Math.round((withinBand / n) * 100),
    meanAbsError: Math.round(meanAbsError * 10) / 10,
    bias: Math.round(bias * 10) / 10,
  }
}

/** Calibration for the NEXT prediction, from resolved history. */
export function calibrationFrom(resolved: ResolvedPrediction[]): Calibration {
  const stats = accuracyStats(resolved)
  return { bias: stats.bias, n: stats.n }
}
