// ParentProof learning-tracker engine — core types.
// Implements the event stream + derived structures from the Learning & Progress
// Tracker Spec v1.0 (Part H). Everything here is pure data; no I/O, no LLM.

/** Cognitive level of a question: Recall / Understand / Apply. */
export type CogLevel = 'R' | 'U' | 'A'

/** Question format. Drives the expected-response-time baseline. */
export type Format = 'MCQ' | 'SA2' | 'SA3' | 'LA5' | 'NUM' | 'DIAG'

/** What kind of test a session was. */
export type SessionType = 'weekly' | 'retest' | 'decay_check'

export type ExamType = 'school_ut' | 'midterm' | 'preboard' | 'board'

/**
 * One answered question — the atomic raw event. All parent-facing claims must
 * ultimately derive from a stream of these (design contract §0).
 */
export interface AnswerEvent {
  childId: string
  itemId: string
  chapter: string
  cogLevel: CogLevel
  format: Format
  /** cohort error rate for this item, ∈ [0,1], seeded 0.5 before cohort data. */
  itemDifficulty: number
  correct: boolean
  responseTimeSec: number
  answerChanged: boolean
  skipped: boolean
  sessionId: string
  /** epoch millis. Passed in explicitly so the engine stays deterministic. */
  timestamp: number
  /** 1-indexed position within its session (for stamina analysis). */
  position: number
}

export interface SessionEvent {
  sessionId: string
  childId: string
  type: SessionType
  assignedAt: number
  completed: boolean
  /** question index the child abandoned at, or null if completed. */
  abandonedAtQ: number | null
}

export interface ExamEvent {
  childId: string
  parentEnteredMarks: number // percent 0-100
  examType: ExamType
  date: number
}

export interface EngineInput {
  childId: string
  /** "now" — all recency math is relative to this. Deterministic by injection. */
  asOf: number
  answers: AnswerEvent[]
  sessions: SessionEvent[]
  exams: ExamEvent[]
}

// ---- Layer 1: per-question enrichment ----

export type ErrorClass =
  | 'CARELESS'
  | 'CONCEPT_GAP'
  | 'GUESS'
  | 'SHAKY'
  | 'STAMINA'
  | 'UNCLASSIFIED'

export interface EnrichedAnswer extends AnswerEvent {
  /** response_time / expected_time for this (format, cogLevel). */
  speedRatio: number
  /** set on wrong answers. */
  errorClass: ErrorClass | null
  /** correct but suspiciously fast on a hard item — excluded from readiness. */
  lucky: boolean
}

// ---- Layer 2: skill ledger ----

/** One chapter × cognitive-level cell. */
export interface Cell {
  chapter: string
  cogLevel: CogLevel
  readiness: number // 0-1
  attempts: number
}

export interface ChapterLedger {
  chapter: string
  readiness: number // 0-1, mean over its cells
  attempts: number
  roteGap: number | null // readiness_R − readiness_UA, null if insufficient data
  roteFlag: 'ROTE' | 'INTUITIVE' | null
  retentionRatio: number | null // decay readiness / peak readiness
  retentionBand: 'strong' | 'normal' | 'fast_fading' | null
}

// ---- Ratings (the parent-facing 5) ----

export type RatingKey = 'mastery' | 'retention' | 'speed' | 'carefulness' | 'consistency'

export interface Rating {
  key: RatingKey
  /** 0-100 where higher is better, or null when below the data floor. */
  score: number | null
  band: string
  /** one plain-language evidence clause with at most one number. */
  evidence: string
  /** true when enough data exists to make the claim (spec §6 floors). */
  hasData: boolean
  trend?: 'up' | 'flat' | 'down'
}

// ---- Insights ----

export interface InsightCandidate {
  metric: string
  polarity: 'positive' | 'negative'
  /** magnitude vs the child's own history, in std-devs. */
  z: number
  /** actionability score 0-1 (fixed table, spec §5.1). */
  actionability: number
  /** novelty: 1 if not headlined recently, else 0.3. */
  novelty: number
  score: number // z × A × N
  headline: string
  detail: string
  actionTonight: string
}

export interface LearningReport {
  childId: string
  asOf: number
  testsTaken: number
  ratings: Record<RatingKey, Rating>
  chapters: ChapterLedger[]
  /** blueprint-weighted overall readiness, 0-100. Drives the Diagnosis "%". */
  readinessPct: number
  velocityPtsPerWeek: number | null
  velocityBand: 'rising' | 'holding' | 'slipping' | null
  /** trailing weekly readiness values (oldest→newest), 0-100. */
  trajectory: number[]
  headline: InsightCandidate | null
  secondary: InsightCandidate[]
  /** true until the min-data floor for insights is cleared (after test 3). */
  coldStart: boolean
}
