// Postgres implementation of the Store seam — the production backend. Works with
// any managed Postgres (Supabase, Neon, Railway, RDS, …) via a DATABASE_URL.
// Column types are chosen so node-postgres hands every numeric back as a JS
// number: INTEGER for small ints/flags, DOUBLE PRECISION for reals + millisecond
// timestamps (1.7e12 is exact well under 2^53) — never BIGINT/NUMERIC, which
// come back as strings.

import pkg from 'pg'
import { randomUUID } from 'node:crypto'
import type { AnswerEvent, EngineInput, ExamEvent, SessionEvent } from '../../src/engine/types.ts'
import type { ExamResult, Prediction } from '../../src/engine/accuracy.ts'
import type { ChildRecord, ParentRecord, Store } from './store.ts'

const { Pool } = pkg

const SCHEMA = `
CREATE TABLE IF NOT EXISTS parents (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, link_channel TEXT, claimed INTEGER, created_at DOUBLE PRECISION
);
CREATE TABLE IF NOT EXISTS auth_tokens (
  token TEXT PRIMARY KEY, parent_id TEXT NOT NULL, created_at DOUBLE PRECISION, last_seen DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS idx_tokens_parent ON auth_tokens(parent_id);
CREATE TABLE IF NOT EXISTS login_codes (
  phone TEXT PRIMARY KEY, code TEXT NOT NULL, expires_at DOUBLE PRECISION, attempts INTEGER, created_at DOUBLE PRECISION
);
CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY, parent_id TEXT, name TEXT NOT NULL, board TEXT, klass INTEGER,
  subjects TEXT, monthly_spend INTEGER, created_at DOUBLE PRECISION
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, child_id TEXT NOT NULL, type TEXT, assigned_at DOUBLE PRECISION,
  completed INTEGER, abandoned_at_q INTEGER, created_at DOUBLE PRECISION
);
CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL, child_id TEXT NOT NULL, item_id TEXT,
  chapter TEXT, cog_level TEXT, format TEXT, item_difficulty DOUBLE PRECISION, correct INTEGER,
  response_time_sec DOUBLE PRECISION, answer_changed INTEGER, skipped INTEGER, position INTEGER, timestamp DOUBLE PRECISION
);
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY, child_id TEXT NOT NULL, subject TEXT, parent_entered_marks DOUBLE PRECISION, exam_type TEXT, date DOUBLE PRECISION
);
CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY, child_id TEXT NOT NULL, subject TEXT, exam_type TEXT,
  point DOUBLE PRECISION, low DOUBLE PRECISION, high DOUBLE PRECISION, basis_readiness DOUBLE PRECISION, made_at DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS idx_answers_child ON answers(child_id);
CREATE INDEX IF NOT EXISTS idx_sessions_child ON sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_exams_child ON exams(child_id);
CREATE INDEX IF NOT EXISTS idx_predictions_child ON predictions(child_id);
`

/** Local Postgres needs no TLS; managed hosts do. */
function sslFor(url: string): false | { rejectUnauthorized: boolean } {
  if (process.env.DATABASE_SSL === 'disable') return false
  if (/@(localhost|127\.0\.0\.1)[:/]/.test(url) || url.includes('sslmode=disable')) return false
  return { rejectUnauthorized: false }
}

export class PostgresStore implements Store {
  private pool: InstanceType<typeof Pool>

  constructor(url: string) {
    this.pool = new Pool({ connectionString: url, ssl: sslFor(url), max: Number(process.env.PG_POOL_MAX ?? 5) })
  }

  async init(): Promise<void> {
    await this.pool.query(SCHEMA)
    // idempotent migrations for pre-existing databases
    await this.pool.query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS subject TEXT')
    await this.pool.query('ALTER TABLE parents ADD COLUMN IF NOT EXISTS link_channel TEXT')
    await this.pool.query('ALTER TABLE parents ADD COLUMN IF NOT EXISTS claimed INTEGER')
  }

  async isEmpty(): Promise<boolean> {
    const { rows } = await this.pool.query<{ n: string }>('SELECT COUNT(*)::int AS n FROM children')
    return Number(rows[0].n) === 0
  }

  async upsertParent(p: ParentRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO parents (id, name, phone, link_channel, claimed, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE parents.phone END,
         link_channel = EXCLUDED.link_channel,
         claimed = CASE WHEN EXCLUDED.claimed = 1 THEN 1 ELSE parents.claimed END`,
      [p.id, p.name, p.phone, p.channel ?? 'manual', p.claimed ? 1 : 0, Date.now()],
    )
  }

  async createParent(p: ParentRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO parents (id, name, phone, link_channel, claimed, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [p.id, p.name, p.phone, p.channel ?? 'manual', p.claimed ? 1 : 0, Date.now()],
    )
  }

  private rowToParent(r: Record<string, unknown> | undefined): ParentRecord | null {
    if (!r) return null
    return {
      id: r.id as string,
      name: (r.name as string) ?? '',
      phone: (r.phone as string) ?? '',
      channel: (r.link_channel as string) ?? 'manual',
      claimed: !!r.claimed,
    }
  }

  async getParent(id: string): Promise<ParentRecord | null> {
    const { rows } = await this.pool.query('SELECT * FROM parents WHERE id = $1', [id])
    return this.rowToParent(rows[0])
  }

  async getParentByPhone(phone: string): Promise<ParentRecord | null> {
    if (!phone) return null
    const { rows } = await this.pool.query("SELECT * FROM parents WHERE phone = $1 AND phone <> '' ORDER BY created_at LIMIT 1", [phone])
    return this.rowToParent(rows[0])
  }

  async getChildrenForParent(parentId: string): Promise<ChildRecord[]> {
    const { rows } = await this.pool.query('SELECT * FROM children WHERE parent_id = $1 ORDER BY created_at', [parentId])
    return rows.map((r) => ({
      id: r.id,
      parentId: r.parent_id ?? '',
      name: r.name,
      board: r.board ?? 'CBSE',
      klass: r.klass ?? 10,
      subjects: JSON.parse(r.subjects || '[]'),
      monthlySpend: r.monthly_spend ?? 0,
    }))
  }

  async createToken(token: string, parentId: string): Promise<void> {
    const now = Date.now()
    await this.pool.query('INSERT INTO auth_tokens (token, parent_id, created_at, last_seen) VALUES ($1, $2, $3, $4)', [token, parentId, now, now])
  }

  async parentIdForToken(token: string): Promise<string | null> {
    const { rows } = await this.pool.query('SELECT parent_id FROM auth_tokens WHERE token = $1', [token])
    if (!rows[0]) return null
    await this.pool.query('UPDATE auth_tokens SET last_seen = $1 WHERE token = $2', [Date.now(), token])
    return rows[0].parent_id
  }

  async deleteToken(token: string): Promise<void> {
    await this.pool.query('DELETE FROM auth_tokens WHERE token = $1', [token])
  }

  async putLoginCode(phone: string, code: string, expiresAt: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO login_codes (phone, code, expires_at, attempts, created_at) VALUES ($1, $2, $3, 0, $4)
       ON CONFLICT (phone) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, attempts = 0, created_at = EXCLUDED.created_at`,
      [phone, code, expiresAt, Date.now()],
    )
  }

  async getLoginCode(phone: string): Promise<{ code: string; expiresAt: number; attempts: number } | null> {
    const { rows } = await this.pool.query('SELECT code, expires_at, attempts FROM login_codes WHERE phone = $1', [phone])
    const r = rows[0]
    return r ? { code: r.code, expiresAt: r.expires_at, attempts: r.attempts ?? 0 } : null
  }

  async incLoginAttempt(phone: string): Promise<void> {
    await this.pool.query('UPDATE login_codes SET attempts = attempts + 1 WHERE phone = $1', [phone])
  }

  async clearLoginCode(phone: string): Promise<void> {
    await this.pool.query('DELETE FROM login_codes WHERE phone = $1', [phone])
  }

  async upsertChild(c: ChildRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO children (id, parent_id, name, board, klass, subjects, monthly_spend, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, board = EXCLUDED.board, klass = EXCLUDED.klass,
         subjects = EXCLUDED.subjects, monthly_spend = EXCLUDED.monthly_spend`,
      [c.id, c.parentId, c.name, c.board, c.klass, JSON.stringify(c.subjects), c.monthlySpend, Date.now()],
    )
  }

  async getChild(id: string): Promise<ChildRecord | null> {
    const { rows } = await this.pool.query('SELECT * FROM children WHERE id = $1', [id])
    const r = rows[0]
    if (!r) return null
    return {
      id: r.id,
      parentId: r.parent_id ?? '',
      name: r.name,
      board: r.board ?? 'CBSE',
      klass: r.klass ?? 10,
      subjects: JSON.parse(r.subjects || '[]'),
      monthlySpend: r.monthly_spend ?? 0,
    }
  }

  async addSession(s: SessionEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO sessions (id, child_id, type, assigned_at, completed, abandoned_at_q, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         type = EXCLUDED.type, assigned_at = EXCLUDED.assigned_at,
         completed = EXCLUDED.completed, abandoned_at_q = EXCLUDED.abandoned_at_q`,
      [s.sessionId, s.childId, s.type, s.assignedAt, s.completed ? 1 : 0, s.abandonedAtQ, Date.now()],
    )
  }

  async addAnswers(answers: AnswerEvent[]): Promise<void> {
    if (answers.length === 0) return
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      for (const a of answers) {
        await client.query(
          `INSERT INTO answers
           (id, session_id, child_id, item_id, chapter, cog_level, format, item_difficulty, correct,
            response_time_sec, answer_changed, skipped, position, timestamp)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [
            randomUUID(), a.sessionId, a.childId, a.itemId, a.chapter, a.cogLevel, a.format, a.itemDifficulty,
            a.correct ? 1 : 0, a.responseTimeSec, a.answerChanged ? 1 : 0, a.skipped ? 1 : 0, a.position, a.timestamp,
          ],
        )
      }
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  async addExamResult(e: ExamResult): Promise<void> {
    await this.pool.query(
      `INSERT INTO exams (id, child_id, subject, parent_entered_marks, exam_type, date)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), e.childId, e.subject, e.marks, e.examType, e.date],
    )
  }

  async addPrediction(p: Prediction): Promise<string> {
    const id = p.id ?? randomUUID()
    await this.pool.query(
      `INSERT INTO predictions (id, child_id, subject, exam_type, point, low, high, basis_readiness, made_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, p.childId, p.subject, p.examType, p.point, p.low, p.high, p.basisReadiness, p.madeAt],
    )
    return id
  }

  async getPredictions(childId: string): Promise<Prediction[]> {
    const { rows } = await this.pool.query('SELECT * FROM predictions WHERE child_id = $1', [childId])
    return rows.map((r) => ({
      id: r.id,
      childId: r.child_id,
      subject: r.subject,
      examType: r.exam_type,
      point: r.point,
      low: r.low,
      high: r.high,
      basisReadiness: r.basis_readiness,
      madeAt: r.made_at,
    }))
  }

  async getExamResults(childId: string): Promise<ExamResult[]> {
    const { rows } = await this.pool.query('SELECT * FROM exams WHERE child_id = $1', [childId])
    return rows.map((r) => ({
      childId: r.child_id,
      subject: r.subject ?? 'Maths',
      examType: r.exam_type,
      marks: r.parent_entered_marks,
      date: r.date,
    }))
  }

  async getEngineInput(childId: string, asOf: number): Promise<EngineInput> {
    const [a, s, e] = await Promise.all([
      this.pool.query('SELECT * FROM answers WHERE child_id = $1', [childId]),
      this.pool.query('SELECT * FROM sessions WHERE child_id = $1', [childId]),
      this.pool.query('SELECT * FROM exams WHERE child_id = $1', [childId]),
    ])
    const answers: AnswerEvent[] = a.rows.map((r) => ({
      childId: r.child_id,
      itemId: r.item_id,
      chapter: r.chapter,
      cogLevel: r.cog_level as AnswerEvent['cogLevel'],
      format: r.format as AnswerEvent['format'],
      itemDifficulty: r.item_difficulty,
      correct: !!r.correct,
      responseTimeSec: r.response_time_sec,
      answerChanged: !!r.answer_changed,
      skipped: !!r.skipped,
      sessionId: r.session_id,
      timestamp: r.timestamp,
      position: r.position,
    }))
    const sessions: SessionEvent[] = s.rows.map((r) => ({
      sessionId: r.id,
      childId: r.child_id,
      type: r.type as SessionEvent['type'],
      assignedAt: r.assigned_at,
      completed: !!r.completed,
      abandonedAtQ: r.abandoned_at_q ?? null,
    }))
    const exams: ExamEvent[] = e.rows.map((r) => ({
      childId: r.child_id,
      parentEnteredMarks: r.parent_entered_marks,
      examType: r.exam_type as ExamEvent['examType'],
      date: r.date,
    }))
    return { childId, asOf, answers, sessions, exams }
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}
