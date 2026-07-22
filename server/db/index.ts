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
  for (const exam of stream.exams) s.addExam(exam)
  console.log(`[db] seeded Mukul — ${stream.answers.length} answers across ${stream.sessions.length} sessions`)
}
