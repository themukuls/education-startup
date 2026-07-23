// Store singleton + first-boot seed. Picks Postgres when DATABASE_URL is set
// (production), else SQLite (local dev) — the only thing that changes between
// them is this one line. Seeding loads Mukul's synthetic history so a fresh
// database starts full, but it's real, persisted data you can add to.

import { SqliteStore, type Store, type StoreKind } from './store.ts'
import { PostgresStore } from './postgres.ts'
import { buildStream } from '../../src/engine/synthetic.ts'

const DB_PATH = process.env.DB_PATH ?? 'parentproof.db'
const DATABASE_URL = process.env.DATABASE_URL ?? ''

export const storeKind: StoreKind = DATABASE_URL ? 'postgres' : 'sqlite'

let storePromise: Promise<Store> | null = null

/** Resolve the shared Store, creating schema + seeding on first call. */
export function getStore(): Promise<Store> {
  if (!storePromise) storePromise = createAndSeed()
  return storePromise
}

async function createAndSeed(): Promise<Store> {
  const s: Store = DATABASE_URL ? new PostgresStore(DATABASE_URL) : new SqliteStore(DB_PATH)
  await s.init()
  await seedIfEmpty(s)
  return s
}

async function seedIfEmpty(s: Store): Promise<void> {
  if (!(await s.isEmpty())) return
  const now = Date.now()
  await s.upsertParent({ id: 'priya', name: 'Priya Sharma', phone: '' })
  await s.upsertChild({
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
  for (const session of stream.sessions) await s.addSession(session)
  await s.addAnswers(stream.answers)

  // Seed a believable — and honest (one miss) — prediction track record.
  const WEEK = 7 * 24 * 60 * 60 * 1000
  const track: { subject: string; examType: string; point: number; low: number; high: number; madeWk: number; marks: number; examWk: number }[] = [
    { subject: 'Maths', examType: 'school_ut', point: 54, low: 42, high: 66, madeWk: 6, marks: 58, examWk: 5 }, // +4 ✓
    { subject: 'Science', examType: 'school_ut', point: 57, low: 45, high: 69, madeWk: 5, marks: 55, examWk: 4 }, // -2 ✓
    { subject: 'Maths', examType: 'midterm', point: 61, low: 53, high: 69, madeWk: 3, marks: 66, examWk: 2 }, // +5 ✓
    { subject: 'Maths', examType: 'school_ut', point: 66, low: 58, high: 74, madeWk: 2, marks: 55, examWk: 1 }, // -11 ✗ (honest miss)
  ]
  for (const t of track) {
    await s.addPrediction({
      childId: 'mukul',
      subject: t.subject,
      examType: t.examType,
      point: t.point,
      low: t.low,
      high: t.high,
      basisReadiness: t.point,
      madeAt: now - t.madeWk * WEEK,
    })
    await s.addExamResult({ childId: 'mukul', subject: t.subject, examType: t.examType, marks: t.marks, date: now - t.examWk * WEEK })
  }
  console.log(
    `[db] seeded Mukul (${storeKind}) — ${stream.answers.length} answers across ${stream.sessions.length} sessions, ${track.length} predictions`,
  )
}
