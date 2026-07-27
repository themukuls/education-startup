import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { computeReport, type LearningReport } from '../engine'
import { buildStream } from '../engine/synthetic'
import { fetchReport, postSession, type RawAnswer } from '../api/persistence'
import { saveAccount } from '../api/account'
import { ensureSession, fetchMe, type ChildDTO } from '../api/auth'
import { createChild as apiCreateChild } from '../api/children'

export type Goal = 'board' | 'weak-subject' | 'habit'
export type AccountStatus = 'guest' | 'claimed'
/** How the parent claimed their record. WhatsApp = verified by the phone's own
 * WhatsApp (no OTP); manual = typed number (desktop fallback). */
export type LinkChannel = 'whatsapp' | 'manual'

const ls = {
  get: (k: string, fallback = '') => {
    try {
      return localStorage.getItem(k) ?? fallback
    } catch {
      return fallback
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* ignore (private mode) */
    }
  },
}

// Fixed "now" so the offline fallback report is deterministic (no Date.now()).
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
  /** The active child's id in the store (from /api/me), or null until it loads. */
  childId: string | null
  /** all children this account owns (for the switcher). */
  children: ChildDTO[]
  /** true once we know whether the account has a child (avoids empty-state flash). */
  accountReady: boolean
  /** Create this account's child from the onboarding form; adopts it as active. */
  createChild: () => Promise<void>
  /** Load the seeded demo child (for exploring), adopting it as active. */
  loadDemo: () => Promise<void>
  /** Switch the active child to another one this account owns. */
  switchChild: (id: string) => Promise<void>

  // ---- guest-first / deferred save ----
  accountStatus: AccountStatus
  /** how they linked (empty while guest). */
  parentChannel: LinkChannel | ''
  saveGateOpen: boolean
  /** whether we've already nudged them to save after finishing a test (once/session). */
  afterTestPrompted: boolean
  openSaveGate: () => void
  closeSaveGate: () => void
  markAfterTestPrompted: () => void
  /**
   * Claim the guest record. On a phone the parent links via WhatsApp (verified
   * by their own WhatsApp, no OTP) so `phone` may be empty; on desktop they type
   * it. Marks claimed and persists locally + best-effort to the backend.
   */
  claimAccount: (name: string, phone: string, channel?: LinkChannel) => Promise<void>
}

const defaultChild: Child = {
  name: '',
  board: 'CBSE',
  klass: 10,
  subjects: ['Maths', 'Science'],
  monthlySpend: 5000,
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [parentName, setParentName] = useState(() => ls.get('pp.name', 'Priya'))
  const [parentPhone, setParentPhone] = useState(() => ls.get('pp.phone', ''))
  const [accountStatus, setAccountStatus] = useState<AccountStatus>(
    () => (ls.get('pp.status', 'guest') === 'claimed' ? 'claimed' : 'guest'),
  )
  const [parentChannel, setParentChannel] = useState<LinkChannel | ''>(
    () => (ls.get('pp.channel', '') === 'whatsapp' ? 'whatsapp' : ls.get('pp.channel', '') === 'manual' ? 'manual' : ''),
  )
  const [saveGateOpen, setSaveGateOpen] = useState(false)
  const [afterTestPrompted, setAfterTestPrompted] = useState(false)
  const [child, setChildState] = useState<Child>(defaultChild)
  const [goal, setGoal] = useState<Goal>('board')
  const [readiness] = useState(68)
  const [weeklyDelta] = useState(7)
  const [streak] = useState(5)
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [answered, setAnswered] = useState(0)
  const [childId, setChildId] = useState<string | null>(null)
  const [childList, setChildList] = useState<ChildDTO[]>([])
  const [accountReady, setAccountReady] = useState(false)

  // Report state. Initialised synchronously with the synthetic stream so the UI
  // renders instantly and still works offline, then replaced by the child's
  // real, stored report from the backend when it arrives.
  const [report, setReport] = useState<LearningReport>(() =>
    computeReport(buildStream({ archetype: 'improver', childId: 'demo', asOf: DEMO_ASOF, seed: 7 })),
  )

  // On mount: ensure a session (mint an anonymous token if none), then adopt
  // THIS account's parent + first child from /api/me. Removes the hardcoded
  // child id — each browser now sees its own isolated data. Falls back to the
  // synthetic report + guest defaults when the backend is unavailable.
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await ensureSession()
        const me = await fetchMe()
        if (!alive) return
        if (me.parent) {
          setParentName(me.parent.name || 'Guest')
          setParentPhone(me.parent.phone || '')
          setParentChannel(me.parent.channel === 'whatsapp' ? 'whatsapp' : me.parent.channel === 'manual' ? 'manual' : '')
          setAccountStatus(me.parent.claimed ? 'claimed' : 'guest')
          ls.set('pp.status', me.parent.claimed ? 'claimed' : 'guest')
          if (me.parent.name) ls.set('pp.name', me.parent.name)
        }
        if (alive) setChildList(me.children)
        const first = me.children[0]
        if (first) {
          setChildId(first.id)
          setChildState({ name: first.name, board: first.board, klass: first.klass, subjects: first.subjects, monthlySpend: first.monthlySpend })
          const r = await fetchReport(first.id)
          if (alive) setReport(r)
        }
        if (alive) setAccountReady(true)
      } catch {
        /* backend unavailable — keep the synthetic fallback + guest defaults */
        if (alive) setAccountReady(true)
      }
    })()
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
      childId,
      children: childList,
      accountReady,
      setParentName,
      setGoal,
      setChild: (patch) => setChildState((prev) => ({ ...prev, ...patch })),
      createChild: async () => {
        const c = await apiCreateChild(
          { name: child.name.trim() || 'My child', board: child.board, klass: child.klass, subjects: child.subjects, monthlySpend: child.monthlySpend },
          false,
        )
        setChildList((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]))
        setChildId(c.id)
        setChildState({ name: c.name, board: c.board, klass: c.klass, subjects: c.subjects, monthlySpend: c.monthlySpend })
        try {
          setReport(await fetchReport(c.id))
        } catch {
          /* fresh child has no history yet — keep placeholder until first test */
        }
      },
      loadDemo: async () => {
        const c = await apiCreateChild(
          { name: 'Mukul', board: 'CBSE', klass: 10, subjects: ['Maths', 'Science'], monthlySpend: 5000 },
          true,
        )
        setChildList((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]))
        setChildId(c.id)
        setChildState({ name: c.name, board: c.board, klass: c.klass, subjects: c.subjects, monthlySpend: c.monthlySpend })
        setReport(await fetchReport(c.id))
      },
      switchChild: async (id) => {
        const c = childList.find((x) => x.id === id)
        if (!c || id === childId) return
        setChildId(c.id)
        setChildState({ name: c.name, board: c.board, klass: c.klass, subjects: c.subjects, monthlySpend: c.monthlySpend })
        try {
          setReport(await fetchReport(c.id))
        } catch {
          /* keep current until it loads */
        }
      },
      recordTest: (score, ans) => {
        setLastScore(score)
        setAnswered(ans)
      },
      recordSession: async (answers) => {
        if (!childId) return
        try {
          const updated = await postSession(childId, answers)
          setReport(updated)
        } catch (err) {
          console.warn('[state] session not persisted (backend unavailable):', err)
        }
      },
      accountStatus,
      parentChannel,
      saveGateOpen,
      afterTestPrompted,
      openSaveGate: () => setSaveGateOpen(true),
      closeSaveGate: () => setSaveGateOpen(false),
      markAfterTestPrompted: () => setAfterTestPrompted(true),
      claimAccount: async (name, phone, channel = 'manual') => {
        const cleanName = name.trim() || 'Parent'
        const cleanPhone = phone.trim()
        setParentName(cleanName)
        setParentPhone(cleanPhone)
        setParentChannel(channel)
        setAccountStatus('claimed')
        ls.set('pp.name', cleanName)
        ls.set('pp.phone', cleanPhone)
        ls.set('pp.channel', channel)
        ls.set('pp.status', 'claimed')
        setSaveGateOpen(false)
        try {
          await saveAccount(cleanName, cleanPhone, channel)
        } catch (err) {
          console.warn('[state] account not persisted (backend unavailable):', err)
        }
      },
    }
  }, [
    parentName,
    parentPhone,
    accountStatus,
    parentChannel,
    saveGateOpen,
    afterTestPrompted,
    child,
    goal,
    readiness,
    weeklyDelta,
    streak,
    lastScore,
    answered,
    report,
    childId,
    childList,
    accountReady,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
