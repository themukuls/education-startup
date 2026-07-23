import { describe, it, expect } from 'vitest'
import {
  predictBand,
  resolvePredictions,
  accuracyStats,
  calibrationFrom,
  type Prediction,
  type ExamResult,
} from './accuracy'

function pred(over: Partial<Prediction>): Prediction {
  return {
    childId: 'c',
    subject: 'Maths',
    examType: 'school_ut',
    point: 60,
    low: 52,
    high: 68,
    basisReadiness: 60,
    madeAt: 1000,
    ...over,
  }
}
function exam(over: Partial<ExamResult>): ExamResult {
  return { childId: 'c', subject: 'Maths', examType: 'school_ut', marks: 62, date: 2000, ...over }
}

describe('predictBand', () => {
  it('widens the band with little history (under-claim early)', () => {
    expect(predictBand(60).halfWidth).toBe(12)
    expect(predictBand(60, { bias: 0, n: 3 }).halfWidth).toBe(8)
  })
  it('shifts the centre by calibration bias', () => {
    expect(predictBand(60, { bias: -5, n: 3 }).point).toBe(55)
  })
  it('clamps to 0-100', () => {
    expect(predictBand(96, { bias: 0, n: 3 }).high).toBe(100)
    expect(predictBand(3, { bias: 0, n: 3 }).low).toBe(0)
  })
})

describe('resolvePredictions', () => {
  it('pairs an exam with the latest prediction made before it', () => {
    const preds = [pred({ point: 55, madeAt: 500 }), pred({ point: 61, madeAt: 1500 })]
    const r = resolvePredictions(preds, [exam({ marks: 64, date: 2000 })])
    expect(r).toHaveLength(1)
    expect(r[0].prediction.point).toBe(61) // the more recent one
    expect(r[0].error).toBe(3)
    expect(r[0].within8).toBe(true)
  })
  it('ignores predictions made after the exam', () => {
    const r = resolvePredictions([pred({ madeAt: 3000 })], [exam({ date: 2000 })])
    expect(r).toHaveLength(0)
  })
  it('matches on subject + exam type', () => {
    const r = resolvePredictions([pred({ subject: 'Science' })], [exam({ subject: 'Maths' })])
    expect(r).toHaveLength(0)
  })
  it('flags a miss honestly (outside ±8)', () => {
    const r = resolvePredictions([pred({ point: 70, low: 62, high: 78 })], [exam({ marks: 58, date: 2000 })])
    expect(r[0].within8).toBe(false)
    expect(r[0].withinBand).toBe(false)
    expect(r[0].error).toBe(-12)
  })
})

describe('accuracyStats', () => {
  it('computes the published within-±8% stat and bias', () => {
    const preds = [
      pred({ point: 55, low: 43, high: 67, madeAt: 100 }),
      pred({ point: 61, low: 49, high: 73, madeAt: 200, examType: 'midterm' }),
      pred({ point: 70, low: 62, high: 78, madeAt: 300, examType: 'preboard' }),
    ]
    const exams = [
      exam({ marks: 58, date: 1000 }), // err +3 ✓
      exam({ marks: 64, date: 1100, examType: 'midterm' }), // err +3 ✓
      exam({ marks: 58, date: 1200, examType: 'preboard' }), // err -12 ✗
    ]
    const stats = accuracyStats(resolvePredictions(preds, exams))
    expect(stats.n).toBe(3)
    expect(stats.within8).toBe(2)
    expect(stats.within8Pct).toBe(67)
    // bias = (3 + 3 - 12) / 3 = -2
    expect(stats.bias).toBe(-2)
  })
  it('is empty-safe', () => {
    expect(accuracyStats([]).n).toBe(0)
  })
})

describe('calibrationFrom', () => {
  it('derives bias + n to feed the next prediction', () => {
    const preds = [pred({ point: 60, madeAt: 100 })]
    const cal = calibrationFrom(resolvePredictions(preds, [exam({ marks: 66, date: 1000 })]))
    expect(cal).toEqual({ bias: 6, n: 1 })
  })
})
