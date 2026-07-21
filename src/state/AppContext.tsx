import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type Goal = 'board' | 'weak-subject' | 'habit'

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
      setParentName,
      setGoal,
      setChild: (patch) => setChildState((prev) => ({ ...prev, ...patch })),
      recordTest: (score, ans) => {
        setLastScore(score)
        setAnswered(ans)
      },
    }
  }, [parentName, child, goal, readiness, weeklyDelta, streak, lastScore, answered])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
