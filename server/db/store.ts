// Persistence layer. A narrow Store interface with a SQLite implementation.
// Everything the app persists flows through this seam, so swapping SQLite for
// Postgres later means writing one more implementation — nothing else changes.

import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { AnswerEvent, EngineInput, ExamEvent, SessionEvent } from '../../src/engine/types.ts'
import type { ExamResult, Prediction } from '../../src/engine/accuracy.ts'

export interface ChildRecord {
  id: string
  parentId: string
  name: string
  board: string
  klass: number
  subjects: string[]
  monthlySpend: number
}

export interface ParentRecord {
  id: string
  name: string
  phone: string
  /** how they linked: 'whatsapp' (verified by their phone, no OTP) or 'manual'. */
  channel?: string
  /** false while an anonymous guest; true once they save name + phone. */
  claimed?: boolean
}

// The interface is async so the same seam backs SQLite (sync driver, wrapped)
// and Postgres (async driver) with no change to callers — swap by env only.
export interface Store {
  /** create schema + run migrations. Call once before use. */
  init(): Promise<void>
  isEmpty(): Promise<boolean>
  upsertParent(p: ParentRecord): Promise<void>
  /** insert a brand-new parent row (used to mint an anonymous account). */
  createParent(p: ParentRecord): Promise<void>
  getParent(id: string): Promise<ParentRecord | null>
  getParentByPhone(phone: string): Promise<ParentRecord | null>
  /** all children owned by a parent — the basis for per-user data isolation. */
  getChildrenForParent(parentId: string): Promise<ChildRecord[]>
  // ---- auth tokens (opaque bearer session) ----
  createToken(token: string, parentId: string): Promise<void>
  /** resolve a bearer token to its parent id (and bump last-seen), or null. */
  parentIdForToken(token: string): Promise<string | null>
  deleteToken(token: string): Promise<void>
  // ---- cross-device login codes (phone → one-time code) ----
  putLoginCode(phone: string, code: string, expiresAt: number): Promise<void>
  getLoginCode(phone: string): Promise<{ code: string; expiresAt: number; attempts: number } | null>
  incLoginAttempt(phone: string): Promise<void>
  clearLoginCode(phone: string): Promise<void>
  upsertChild(c: ChildRecord): Promise<void>
  getChild(id: string): Promise<ChildRecord | null>
  addSession(s: SessionEvent): Promise<void>
  addAnswers(a: AnswerEvent[]): Promise<void>
  addExamResult(e: ExamResult): Promise<void>
  addPrediction(p: Prediction): Promise<string>
  getPredictions(childId: string): Promise<Prediction[]>
  getExamResults(childId: string): Promise<ExamResult[]>
  /** everything the engine needs for one child, as of `asOf`. */
  getEngineInput(childId: string, asOf: number): Promise<EngineInput>
  close(): Promise<void>
}

/** The backend a Store speaks to — surfaced on /api/health. */
export type StoreKind = 'sqlite' | 'postgres'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS parents (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, link_channel TEXT, claimed INTEGER, created_at INTEGER
);
CREATE TABLE IF NOT EXISTS auth_tokens (
  token TEXT PRIMARY KEY, parent_id TEXT NOT NULL, created_at INTEGER, last_seen INTEGER
);
CREATE INDEX IF NOT EXISTS idx_tokens_parent ON auth_tokens(parent_id);
CREATE TABLE IF NOT EXISTS login_codes (
  phone TEXT PRIMARY KEY, code TEXT NOT NULL, expires_at INTEGER, attempts INTEGER, created_at INTEGER
);
CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY, parent_id TEXT, name TEXT NOT NULL, board TEXT, klass INTEGER,
  subjects TEXT, monthly_spend INTEGER, created_at INTEGER
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, child_id TEXT NOT NULL, type TEXT, assigned_at INTEGER,
  completed INTEGER, abandoned_at_q INTEGER, created_at INTEGER
);
CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL, child_id TEXT NOT NULL, item_id TEXT,
  chapter TEXT, cog_level TEXT, format TEXT, item_difficulty REAL, correct INTEGER,
  response_time_sec REAL, answer_changed INTEGER, skipped INTEGER, position INTEGER, timestamp INTEGER
);
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY, child_id TEXT NOT NULL, subject TEXT, parent_entered_marks REAL, exam_type TEXT, date INTEGER
);
CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY, child_id TEXT NOT NULL, subject TEXT, exam_type TEXT,
  point REAL, low REAL, high REAL, basis_readiness REAL, made_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_answers_child ON answers(child_id);
CREATE INDEX IF NOT EXISTS idx_sessions_child ON sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_exams_child ON exams(child_id);
CREATE INDEX IF NOT EXISTS idx_predictions_child ON predictions(child_id);
`

export class SqliteStore implements Store {
  private db: Database.Database

  constructor(path: string) {
    this.db = new Database(path)
    this.db.pragma('journal_mode = WAL')
  }

  async init(): Promise<void> {
    this.db.exec(SCHEMA)
    // migration for DBs created before `subject` existed on exams
    try {
      this.db.exec('ALTER TABLE exams ADD COLUMN subject TEXT')
    } catch {
      /* column already present */
    }
    // migration for DBs created before parents tracked how they linked
    try {
      this.db.exec('ALTER TABLE parents ADD COLUMN link_channel TEXT')
    } catch {
      /* column already present */
    }
    // migration for DBs created before the guest/claimed distinction
    try {
      this.db.exec('ALTER TABLE parents ADD COLUMN claimed INTEGER')
    } catch {
      /* column already present */
    }
  }

  async isEmpty(): Promise<boolean> {
    const row = this.db.prepare('SELECT COUNT(*) AS n FROM children').get() as { n: number }
    return row.n === 0
  }

  async upsertParent(p: ParentRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO parents (id, name, phone, link_channel, claimed, created_at)
         VALUES (@id, @name, @phone, @channel, @claimed, @createdAt)
         ON CONFLICT(id) DO UPDATE SET name=@name,
           phone=CASE WHEN @phone != '' THEN @phone ELSE parents.phone END,
           link_channel=@channel,
           claimed=CASE WHEN @claimed=1 THEN 1 ELSE parents.claimed END`,
      )
      .run({ ...p, channel: p.channel ?? 'manual', claimed: p.claimed ? 1 : 0, createdAt: Date.now() })
  }

  async createParent(p: ParentRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO parents (id, name, phone, link_channel, claimed, created_at)
         VALUES (@id, @name, @phone, @channel, @claimed, @createdAt)`,
      )
      .run({ ...p, channel: p.channel ?? 'manual', claimed: p.claimed ? 1 : 0, createdAt: Date.now() })
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
    return this.rowToParent(this.db.prepare('SELECT * FROM parents WHERE id = ?').get(id) as Record<string, unknown> | undefined)
  }

  async getParentByPhone(phone: string): Promise<ParentRecord | null> {
    if (!phone) return null
    return this.rowToParent(
      this.db.prepare('SELECT * FROM parents WHERE phone = ? AND phone != \'\' ORDER BY created_at LIMIT 1').get(phone) as
        | Record<string, unknown>
        | undefined,
    )
  }

  async getChildrenForParent(parentId: string): Promise<ChildRecord[]> {
    const rows = this.db.prepare('SELECT * FROM children WHERE parent_id = ? ORDER BY created_at').all(parentId) as Record<string, unknown>[]
    return rows.map((r) => ({
      id: r.id as string,
      parentId: (r.parent_id as string) ?? '',
      name: r.name as string,
      board: (r.board as string) ?? 'CBSE',
      klass: (r.klass as number) ?? 10,
      subjects: JSON.parse((r.subjects as string) || '[]'),
      monthlySpend: (r.monthly_spend as number) ?? 0,
    }))
  }

  async createToken(token: string, parentId: string): Promise<void> {
    const now = Date.now()
    this.db.prepare('INSERT INTO auth_tokens (token, parent_id, created_at, last_seen) VALUES (?, ?, ?, ?)').run(token, parentId, now, now)
  }

  async parentIdForToken(token: string): Promise<string | null> {
    const row = this.db.prepare('SELECT parent_id FROM auth_tokens WHERE token = ?').get(token) as { parent_id: string } | undefined
    if (!row) return null
    this.db.prepare('UPDATE auth_tokens SET last_seen = ? WHERE token = ?').run(Date.now(), token)
    return row.parent_id
  }

  async deleteToken(token: string): Promise<void> {
    this.db.prepare('DELETE FROM auth_tokens WHERE token = ?').run(token)
  }

  async putLoginCode(phone: string, code: string, expiresAt: number): Promise<void> {
    this.db
      .prepare('INSERT OR REPLACE INTO login_codes (phone, code, expires_at, attempts, created_at) VALUES (?, ?, ?, 0, ?)')
      .run(phone, code, expiresAt, Date.now())
  }

  async getLoginCode(phone: string): Promise<{ code: string; expiresAt: number; attempts: number } | null> {
    const r = this.db.prepare('SELECT code, expires_at, attempts FROM login_codes WHERE phone = ?').get(phone) as
      | { code: string; expires_at: number; attempts: number }
      | undefined
    return r ? { code: r.code, expiresAt: r.expires_at, attempts: r.attempts ?? 0 } : null
  }

  async incLoginAttempt(phone: string): Promise<void> {
    this.db.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE phone = ?').run(phone)
  }

  async clearLoginCode(phone: string): Promise<void> {
    this.db.prepare('DELETE FROM login_codes WHERE phone = ?').run(phone)
  }

  async upsertChild(c: ChildRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO children (id, parent_id, name, board, klass, subjects, monthly_spend, created_at)
         VALUES (@id, @parentId, @name, @board, @klass, @subjects, @monthlySpend, @createdAt)
         ON CONFLICT(id) DO UPDATE SET name=@name, board=@board, klass=@klass, subjects=@subjects, monthly_spend=@monthlySpend`,
      )
      .run({ ...c, subjects: JSON.stringify(c.subjects), createdAt: Date.now() })
  }

  async getChild(id: string): Promise<ChildRecord | null> {
    const r = this.db.prepare('SELECT * FROM children WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined
    if (!r) return null
    return {
      id: r.id as string,
      parentId: (r.parent_id as string) ?? '',
      name: r.name as string,
      board: (r.board as string) ?? 'CBSE',
      klass: (r.klass as number) ?? 10,
      subjects: JSON.parse((r.subjects as string) || '[]'),
      monthlySpend: (r.monthly_spend as number) ?? 0,
    }
  }

  async addSession(s: SessionEvent): Promise<void> {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO sessions (id, child_id, type, assigned_at, completed, abandoned_at_q, created_at)
         VALUES (@sessionId, @childId, @type, @assignedAt, @completed, @abandonedAtQ, @createdAt)`,
      )
      .run({
        sessionId: s.sessionId,
        childId: s.childId,
        type: s.type,
        assignedAt: s.assignedAt,
        completed: s.completed ? 1 : 0,
        abandonedAtQ: s.abandonedAtQ,
        createdAt: Date.now(),
      })
  }

  async addAnswers(answers: AnswerEvent[]): Promise<void> {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO answers
       (id, session_id, child_id, item_id, chapter, cog_level, format, item_difficulty, correct,
        response_time_sec, answer_changed, skipped, position, timestamp)
       VALUES (@id, @sessionId, @childId, @itemId, @chapter, @cogLevel, @format, @itemDifficulty, @correct,
        @responseTimeSec, @answerChanged, @skipped, @position, @timestamp)`,
    )
    const insertMany = this.db.transaction((rows: AnswerEvent[]) => {
      for (const a of rows) {
        stmt.run({
          id: randomUUID(),
          sessionId: a.sessionId,
          childId: a.childId,
          itemId: a.itemId,
          chapter: a.chapter,
          cogLevel: a.cogLevel,
          format: a.format,
          itemDifficulty: a.itemDifficulty,
          correct: a.correct ? 1 : 0,
          responseTimeSec: a.responseTimeSec,
          answerChanged: a.answerChanged ? 1 : 0,
          skipped: a.skipped ? 1 : 0,
          position: a.position,
          timestamp: a.timestamp,
        })
      }
    })
    insertMany(answers)
  }

  async addExamResult(e: ExamResult): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO exams (id, child_id, subject, parent_entered_marks, exam_type, date)
         VALUES (@id, @childId, @subject, @marks, @examType, @date)`,
      )
      .run({ id: randomUUID(), childId: e.childId, subject: e.subject, marks: e.marks, examType: e.examType, date: e.date })
  }

  async addPrediction(p: Prediction): Promise<string> {
    const id = p.id ?? randomUUID()
    this.db
      .prepare(
        `INSERT INTO predictions (id, child_id, subject, exam_type, point, low, high, basis_readiness, made_at)
         VALUES (@id, @childId, @subject, @examType, @point, @low, @high, @basisReadiness, @madeAt)`,
      )
      .run({
        id,
        childId: p.childId,
        subject: p.subject,
        examType: p.examType,
        point: p.point,
        low: p.low,
        high: p.high,
        basisReadiness: p.basisReadiness,
        madeAt: p.madeAt,
      })
    return id
  }

  async getPredictions(childId: string): Promise<Prediction[]> {
    const rows = this.db.prepare('SELECT * FROM predictions WHERE child_id = ?').all(childId) as Record<string, unknown>[]
    return rows.map((r) => ({
      id: r.id as string,
      childId: r.child_id as string,
      subject: r.subject as string,
      examType: r.exam_type as string,
      point: r.point as number,
      low: r.low as number,
      high: r.high as number,
      basisReadiness: r.basis_readiness as number,
      madeAt: r.made_at as number,
    }))
  }

  async getExamResults(childId: string): Promise<ExamResult[]> {
    const rows = this.db.prepare('SELECT * FROM exams WHERE child_id = ?').all(childId) as Record<string, unknown>[]
    return rows.map((r) => ({
      childId: r.child_id as string,
      subject: (r.subject as string) ?? 'Maths',
      examType: r.exam_type as string,
      marks: r.parent_entered_marks as number,
      date: r.date as number,
    }))
  }

  async getEngineInput(childId: string, asOf: number): Promise<EngineInput> {
    const answerRows = this.db.prepare('SELECT * FROM answers WHERE child_id = ?').all(childId) as Record<string, unknown>[]
    const sessionRows = this.db.prepare('SELECT * FROM sessions WHERE child_id = ?').all(childId) as Record<string, unknown>[]
    const examRows = this.db.prepare('SELECT * FROM exams WHERE child_id = ?').all(childId) as Record<string, unknown>[]

    const answers: AnswerEvent[] = answerRows.map((r) => ({
      childId: r.child_id as string,
      itemId: r.item_id as string,
      chapter: r.chapter as string,
      cogLevel: r.cog_level as AnswerEvent['cogLevel'],
      format: r.format as AnswerEvent['format'],
      itemDifficulty: r.item_difficulty as number,
      correct: !!r.correct,
      responseTimeSec: r.response_time_sec as number,
      answerChanged: !!r.answer_changed,
      skipped: !!r.skipped,
      sessionId: r.session_id as string,
      timestamp: r.timestamp as number,
      position: r.position as number,
    }))
    const sessions: SessionEvent[] = sessionRows.map((r) => ({
      sessionId: r.id as string,
      childId: r.child_id as string,
      type: r.type as SessionEvent['type'],
      assignedAt: r.assigned_at as number,
      completed: !!r.completed,
      abandonedAtQ: (r.abandoned_at_q as number | null) ?? null,
    }))
    const exams: ExamEvent[] = examRows.map((r) => ({
      childId: r.child_id as string,
      parentEnteredMarks: r.parent_entered_marks as number,
      examType: r.exam_type as ExamEvent['examType'],
      date: r.date as number,
    }))

    return { childId, asOf, answers, sessions, exams }
  }

  async close(): Promise<void> {
    this.db.close()
  }
}
