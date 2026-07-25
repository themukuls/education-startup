// Client → backend bridge for question generation, with a graceful fallback to
// the vetted static bank so the app always works (offline, no key, or a failed
// call). In a Capacitor build, set VITE_API_BASE to the hosted API origin.

import { auditQuestions } from '../data/testQuestions'
import type { Question } from '../shared/quiz'
import { llmHeaders } from './llm'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export interface TestParams {
  board: string
  klass: number
  subject: string
  chapter: string
  count?: number
}

export interface TestResult {
  questions: Question[]
  source: 'llm' | 'mock' | 'fallback'
}

export async function fetchGeneratedTest(p: TestParams): Promise<TestResult> {
  const res = await fetch(`${API_BASE}/api/generate-test`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...llmHeaders() },
    body: JSON.stringify({ ...p, count: p.count ?? 9 }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`generate failed: ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data.questions) || data.questions.length === 0) throw new Error('no questions')
  return { questions: data.questions as Question[], source: data.source ?? 'llm' }
}

export function fallbackTest(): TestResult {
  return { questions: auditQuestions, source: 'fallback' }
}

/** Try the backend, fall back to the static bank on any failure. Never throws. */
export async function loadTest(p: TestParams): Promise<TestResult> {
  try {
    return await fetchGeneratedTest(p)
  } catch (err) {
    console.warn('[quiz] generation unavailable, using fallback bank:', err)
    return fallbackTest()
  }
}
