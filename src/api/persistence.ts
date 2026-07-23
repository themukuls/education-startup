// Client → backend persistence. Fetch a child's report from their stored
// history, and record a completed test as real events.

import type { LearningReport } from '../engine'
import type { CogLevel, QuestionFormat } from '../shared/quiz'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

/** One answered question as the kid test observed it. */
export interface RawAnswer {
  itemId?: string
  chapter: string
  cogLevel: CogLevel
  format: QuestionFormat
  itemDifficulty: number
  correct: boolean
  responseTimeSec: number
  answerChanged: boolean
  skipped: boolean
  position: number
}

export async function fetchReport(childId: string): Promise<LearningReport> {
  const res = await fetch(`${API_BASE}/api/report/${childId}`, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`report failed: ${res.status}`)
  return res.json()
}

/** Persist a completed test; returns the recomputed report. */
export async function postSession(childId: string, answers: RawAnswer[]): Promise<LearningReport> {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ childId, answers }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`session save failed: ${res.status}`)
  const data = await res.json()
  return data.report as LearningReport
}
