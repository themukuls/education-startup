// Client → backend for the prediction-vs-actual trust engine.

import type { AccuracyStats, Calibration, PredictionBand, ResolvedPrediction } from '../engine'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export interface AccuracyPayload {
  stats: AccuracyStats
  resolved: ResolvedPrediction[]
  calibration: Calibration
  readiness: number
  currentBand: PredictionBand
}

export async function fetchAccuracy(childId: string): Promise<AccuracyPayload> {
  const res = await fetch(`${API_BASE}/api/accuracy/${childId}`, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`accuracy failed: ${res.status}`)
  return res.json()
}

export async function enterMarks(
  childId: string,
  subject: string,
  examType: string,
  marks: number,
): Promise<AccuracyPayload> {
  const res = await fetch(`${API_BASE}/api/exams`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ childId, subject, examType, marks }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`enter marks failed: ${res.status}`)
  return res.json()
}
