// Store singleton + demo seeding. Picks Postgres when DATABASE_URL is set
// (production), else SQLite (local dev). There is no global hardcoded user any
// more: each authenticated parent owns their own children. To keep the app full
// while onboarding is built, a freshly-minted anonymous account is seeded with
// its OWN demo child (isolated from every other account).

import { randomUUID } from 'node:crypto'
import { SqliteStore, type Store, type StoreKind } from './store.ts'
import { PostgresStore } from './postgres.ts'
import { buildStream } from '../../src/engine/synthetic.ts'
import { seedCorpusIfEmpty } from '../rag/corpus.ts'

const DB_PATH = process.env.DB_PATH ?? 'parentproof.db'
const DATABASE_URL = process.env.DATABASE_URL ?? ''

export const storeKind: StoreKind = DATABASE_URL ? 'postgres' : 'sqlite'

let storePromise: Promise<Store> | null = null

/** Resolve the shared Store, creating schema on first call. */
export function getStore(): Promise<Store> {
  if (!storePromise) storePromise = create()
  return storePromise
}

async function create(): Promise<Store> {
  const s: Store = DATABASE_URL ? new PostgresStore(DATABASE_URL) : new SqliteStore(DB_PATH)
  await s.init()
  await seedCorpusIfEmpty(s) // ground question generation in a starter syllabus corpus
  return s
}

/** Seed one child's full demo history (synthetic events + an honest track record). */
export async function seedDemoChild(s: Store, parentId: string, childId: string, name = 'Mukul'): Promise<void> {
  const now = Date.now()
  await s.upsertChild({ id: childId, parentId, name, board: 'CBSE', klass: 10, subjects: ['Maths', 'Science'], monthlySpend: 5000 })
  const stream = buildStream({ archetype: 'improver', childId, asOf: now, seed: 7 })
  for (const session of stream.sessions) await s.addSession(session)
  await s.addAnswers(stream.answers)

  const WEEK = 7 * 24 * 60 * 60 * 1000
  const track = [
    { subject: 'Maths', examType: 'school_ut', point: 54, low: 42, high: 66, madeWk: 6, marks: 58, examWk: 5 },
    { subject: 'Science', examType: 'school_ut', point: 57, low: 45, high: 69, madeWk: 5, marks: 55, examWk: 4 },
    { subject: 'Maths', examType: 'midterm', point: 61, low: 53, high: 69, madeWk: 3, marks: 66, examWk: 2 },
    { subject: 'Maths', examType: 'school_ut', point: 66, low: 58, high: 74, madeWk: 2, marks: 55, examWk: 1 }, // honest miss
  ]
  for (const t of track) {
    await s.addPrediction({ childId, subject: t.subject, examType: t.examType, point: t.point, low: t.low, high: t.high, basisReadiness: t.point, madeAt: now - t.madeWk * WEEK })
    await s.addExamResult({ childId, subject: t.subject, examType: t.examType, marks: t.marks, date: now - t.examWk * WEEK })
  }
}

/** Mint a fresh anonymous account. It starts EMPTY — the parent creates their
 * own child in onboarding (or loads demo data on demand). No global/shared user. */
export async function mintAnonAccount(s: Store): Promise<{ parentId: string }> {
  const parentId = `p_${randomUUID()}`
  await s.createParent({ id: parentId, name: '', phone: '', channel: 'manual', claimed: false })
  return { parentId }
}
