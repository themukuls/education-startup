// Store singleton + first-boot seed. Seeding loads Mukul's synthetic history so
// the demo starts full — but it's now real, persisted data you can add to.

import { SqliteStore, type Store } from './store.ts'
import { buildStream } from '../../src/engine/synthetic.ts'

const DB_PATH = process.env.DB_PATH ?? 'parentproof.db'

let store: Store | null = null

export function getStore(): Store {
  if (!store) {
    store = new SqliteStore(DB_PATH)
    seedIfEmpty(store)
  }
  return store
}

function seedIfEmpty(s: Store): void {
  if (!s.isEmpty()) return
  const now = Date.now()
  s.upsertParent({ id: 'priya', name: 'Priya Sharma', phone: '' })
  s.upsertChild({
    id: 'mukul',
    parentId: 'priya',
    name: 'Mukul',
    board: 'CBSE',
    klass: 10,
    subjects: ['Maths', 'Science'],
    monthlySpend: 5000,
  })
  // anchor the synthetic history to "now" so recency weighting is correct
  const stream = buildStream({ archetype: 'improver', childId: 'mukul', asOf: now, seed: 7 })
  for (const session of stream.sessions) s.addSession(session)
  s.addAnswers(stream.answers)

  // Seed a believable — and honest (one miss) — prediction track record.
  const WEEK = 7 * 24 * 60 * 60 * 1000
  const track: { subject: string; examType: string; point: number; low: number; high: number; madeWk: number; marks: number; examWk: number }[] = [
    { subject: 'Maths', examType: 'school_ut', point: 54, low: 42, high: 66, madeWk: 6, marks: 58, examWk: 5 }, // +4 ✓
    { subject: 'Science', examType: 'school_ut', point: 57, low: 45, high: 69, madeWk: 5, marks: 55, examWk: 4 }, // -2 ✓
    { subject: 'Maths', examType: 'midterm', point: 61, low: 53, high: 69, madeWk: 3, marks: 66, examWk: 2 }, // +5 ✓
    { subject: 'Maths', examType: 'school_ut', point: 66, low: 58, high: 74, madeWk: 2, marks: 55, examWk: 1 }, // -11 ✗ (honest miss)
  ]
  for (const t of track) {
    s.addPrediction({
      childId: 'mukul',
      subject: t.subject,
      examType: t.examType,
      point: t.point,
      low: t.low,
      high: t.high,
      basisReadiness: t.point,
      madeAt: now - t.madeWk * WEEK,
    })
    s.addExamResult({ childId: 'mukul', subject: t.subject, examType: t.examType, marks: t.marks, date: now - t.examWk * WEEK })
  }
  console.log(
    `[db] seeded Mukul — ${stream.answers.length} answers across ${stream.sessions.length} sessions, ${track.length} predictions`,
  )
}
