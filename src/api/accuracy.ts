// Client → backend for the prediction-vs-actual trust engine.

import type { AccuracyStats, Calibration, PredictionBand, ResolvedPrediction } from '../engine'
import { authHeaders } from './auth'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export interface AccuracyPayload {
  stats: AccuracyStats
  resolved: ResolvedPrediction[]
  calibration: Calibration
  readiness: number
  currentBand: PredictionBand
}

export async function fetchAccuracy(childId: string): Promise<AccuracyPayload> {
  const res = await fetch(`${API_BASE}/api/accuracy/${childId}`, { headers: { ...authHeaders() }, signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`accuracy failed: ${res.status}`)
  return res.json()
}

export interface AggregateAccuracy {
  predictions: number
  within8Pct: number
  meanAbsError: number
  children: number
}

/** Anonymised cross-cohort accuracy (no auth). */
export async function fetchAggregateAccuracy(): Promise<AggregateAccuracy> {
  const res = await fetch(`${API_BASE}/api/accuracy/aggregate`, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`aggregate failed: ${res.status}`)
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
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ childId, subject, examType, marks }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`enter marks failed: ${res.status}`)
  return res.json()
}
