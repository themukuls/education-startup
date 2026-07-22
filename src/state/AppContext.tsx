import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { computeReport, type LearningReport } from '../engine'
import { buildStream } from '../engine/synthetic'
import { fetchReport, postSession, type RawAnswer } from '../api/persistence'

export type Goal = 'board' | 'weak-subject' | 'habit'

// Fixed "now" so the offline fallback report is deterministic (no Date.now()).
const DEMO_ASOF = 1_760_000_000_000
/** The demo child's id in the store. */
const CHILD_ID = 'mukul'

export interface Child {
  name: string
  board: string
  klass: number
  subjects: string[]
  monthlySpend: number
}

export interface AppState {
  parentName: string
  parentInitial: string
  /** E.164-ish; empty → WhatsApp share opens the contact picker. */
  parentPhone: string
  child: Child
  goal: Goal
  readiness: number
  weeklyDelta: number
  streak: number
  // last test run
  lastScore: number | null
  answered: number
}

interface AppContextValue extends AppState {
  setChild: (patch: Partial<Child>) => void
  setGoal: (g: Goal) => void
  setParentName: (n: string) => void
  recordTest: (score: number, answered: number) => void
  /** Persist a completed test's real events; updates the report from the store. */
  recordSession: (answers: RawAnswer[]) => Promise<void>
  /** Computed learning report — from the child's stored history (or synthetic fallback). */
  report: LearningReport
}

const defaultChild: Child = {
  name: 'Mukul',
  board: 'CBSE',
  klass: 10,
  subjects: ['Maths', 'Science'],
  monthlySpend: 5000,
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [parentName, setParentName] = useState('Priya')
  const [parentPhone] = useState('')
  const [child, setChildState] = useState<Child>(defaultChild)
  const [goal, setGoal] = useState<Goal>('board')
  const [readiness] = useState(68)
  const [weeklyDelta] = useState(7)
  const [streak] = useState(5)
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [answered, setAnswered] = useState(0)

  // Report state. Initialised synchronously with the synthetic stream so the UI
  // renders instantly and still works offline, then replaced by the child's
  // real, stored report from the backend when it arrives.
  const [report, setReport] = useState<LearningReport>(() =>
    computeReport(buildStream({ archetype: 'improver', childId: CHILD_ID, asOf: DEMO_ASOF, seed: 7 })),
  )

  useEffect(() => {
    let alive = true
    fetchReport(CHILD_ID)
      .then((r) => {
        if (alive) setReport(r)
      })
      .catch(() => {
        /* backend unavailable — keep the synthetic fallback */
      })
    return () => {
      alive = false
    }
  }, [])

  const value = useMemo<AppContextValue>(() => {
    const parentInitial = (parentName.trim()[0] || 'P').toUpperCase()
    return {
      parentName,
      parentInitial,
      parentPhone,
      child,
      goal,
      readiness,
      weeklyDelta,
      streak,
      lastScore,
      answered,
      report,
      setParentName,
      setGoal,
      setChild: (patch) => setChildState((prev) => ({ ...prev, ...patch })),
      recordTest: (score, ans) => {
        setLastScore(score)
        setAnswered(ans)
      },
      recordSession: async (answers) => {
        try {
          const updated = await postSession(CHILD_ID, answers)
          setReport(updated)
        } catch (err) {
          console.warn('[state] session not persisted (backend unavailable):', err)
        }
      },
    }
  }, [parentName, parentPhone, child, goal, readiness, weeklyDelta, streak, lastScore, answered, report])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
