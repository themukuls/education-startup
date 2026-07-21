import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { computeReport, type LearningReport } from '../engine'
import { buildStream } from '../engine/synthetic'

export type Goal = 'board' | 'weak-subject' | 'habit'

// Fixed "now" so the demo report is fully deterministic (no Date.now()).
const DEMO_ASOF = 1_760_000_000_000

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
  /** Computed learning report from the engine — the single source of every metric. */
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
  const [child, setChildState] = useState<Child>(defaultChild)
  const [goal, setGoal] = useState<Goal>('board')
  const [readiness] = useState(68)
  const [weeklyDelta] = useState(7)
  const [streak] = useState(5)
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [answered, setAnswered] = useState(0)

  // The demo learning report — computed once from a synthetic event stream by
  // the deterministic engine. In production this stream is the child's real
  // answered-question history; nothing about the UI changes.
  const report = useMemo(
    () => computeReport(buildStream({ archetype: 'improver', childId: 'mukul', asOf: DEMO_ASOF, seed: 7 })),
    [],
  )

  const value = useMemo<AppContextValue>(() => {
    const parentInitial = (parentName.trim()[0] || 'P').toUpperCase()
    return {
      parentName,
      parentInitial,
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
    }
  }, [parentName, child, goal, readiness, weeklyDelta, streak, lastScore, answered, report])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
