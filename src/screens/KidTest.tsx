import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../components/PhoneFrame'
import { useApp } from '../state/AppContext'
import { loadTest, type TestResult } from '../api/quiz'
import type { RawAnswer } from '../api/persistence'
import type { Question } from '../shared/quiz'
import { c, serif } from '../theme'

const TOTAL_SECONDS = 600

// Used only until the child has a profile / any history to read from.
const DEFAULT_SUBJECT = 'Maths'
const DEFAULT_CHAPTER = 'Quadratics'

// Screen 05 — Kid test (kid-facing). One path, big targets, live progress bar.
// This wrapper loads the generated test (LLM backend), showing a brief
// preparing state, then renders the runner. Falls back to the static bank.
export default function KidTest() {
  const { child, report } = useApp()
  const [test, setTest] = useState<TestResult | null>(null)

  // Test the child's own subject, and the chapter they are currently weakest at
  // — report.chapters is sorted weakest-first — so the audit re-tests the real
  // gap and rotates as the ledger moves, instead of repeating one fixed test.
  const subject = child.subjects[0] ?? DEFAULT_SUBJECT
  const chapter = report.chapters?.[0]?.chapter ?? DEFAULT_CHAPTER

  useEffect(() => {
    let alive = true
    loadTest({ board: child.board, klass: child.klass, subject, chapter }).then((t) => {
      if (alive) setTest(t)
    })
    return () => {
      alive = false
    }
  }, [child.board, child.klass, subject, chapter])

  if (!test) return <PreparingScreen name={child.name} />
  return <TestRunner questions={test.questions} />
}

function PreparingScreen({ name }: { name: string }) {
  return (
    <PhoneFrame bg="#161B3E" notch="#0D0F26" tint="light" time="9:47" battery={70} contentStyle={{ padding: '20px 26px 26px', color: c.navyText, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ margin: 'auto', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', border: `3px solid ${c.navy2}`, borderTopColor: c.amber, margin: '0 auto 22px', animation: 'ppSpin 0.9s linear infinite' }} />
        <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: c.amber, marginBottom: 10 }}>Preparing the audit</div>
        <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 26, margin: 0, lineHeight: 1.2 }}>
          Building {name}&apos;s
          <br />
          questions…
        </h2>
        <p style={{ fontSize: 14, color: c.navyMute, marginTop: 14, fontWeight: 500 }}>Mapped to today&apos;s syllabus position.</p>
      </div>
    </PhoneFrame>
  )
}

function TestRunner({ questions }: { questions: Question[] }) {
  const nav = useNavigate()
  const { child, recordTest, recordSession } = useApp()
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS)

  // Capture real engine events as the child answers.
  const eventsRef = useRef<RawAnswer[]>([])
  const shownAtRef = useRef<number>(Date.now())
  const changesRef = useRef<number>(0)

  const q = questions[idx]
  const total = questions.length
  const initial = (child.name.trim()[0] || 'M').toUpperCase()

  function captureCurrent(chosen: number | null) {
    eventsRef.current.push({
      itemId: `q${q.id}`,
      chapter: q.topic,
      cogLevel: q.skill,
      format: q.format ?? (q.skill === 'A' ? 'NUM' : 'MCQ'),
      itemDifficulty: q.difficulty ?? 0.5,
      correct: chosen === q.answer,
      responseTimeSec: Math.max(1, Math.round((Date.now() - shownAtRef.current) / 1000)),
      answerChanged: changesRef.current > 1,
      skipped: chosen === null,
      position: idx + 1,
    })
  }

  function select(i: number) {
    changesRef.current += 1
    setSelected(i)
  }

  useEffect(() => {
    if (secondsLeft <= 0) {
      finish(correct)
      return
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft])

  const clock = useMemo(() => {
    const m = Math.floor(secondsLeft / 60)
    const s = secondsLeft % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }, [secondsLeft])

  function finish(finalCorrect: number) {
    const score = Math.round((finalCorrect / total) * 100)
    recordTest(score, total)
    // persist the real events; the report updates from the child's stored history
    void recordSession(eventsRef.current)
    nav('/audit/complete')
  }

  function next() {
    captureCurrent(selected)
    const nowCorrect = correct + (selected === q.answer ? 1 : 0)
    setCorrect(nowCorrect)
    if (idx + 1 >= total) {
      finish(nowCorrect)
    } else {
      setIdx(idx + 1)
      setSelected(null)
      shownAtRef.current = Date.now()
      changesRef.current = 0
    }
  }

  const letters = ['A', 'B', 'C', 'D']

  return (
    <PhoneFrame
      bg="#161B3E"
      notch="#0D0F26"
      tint="light"
      time="9:47"
      battery={70}
      contentStyle={{ padding: '20px 26px 26px', color: c.navyText }}
    >
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: c.amber, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: c.navy, fontSize: 15 }}>
            {initial}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{child.name}</div>
            <div style={{ fontSize: 11, color: c.navyMute, fontWeight: 600 }}>
              {q.subject} · {q.topic}
            </div>
          </div>
        </div>
        <div style={{ background: c.navy2, borderRadius: 20, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, background: c.amber, borderRadius: '50%' }} />
          <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{clock}</span>
        </div>
      </div>

      {/* progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26 }}>
        <div style={{ flex: 1, height: 7, background: c.navy2, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${((idx + 1) / total) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#6E8CEA,#E0A020)', borderRadius: 4, transition: 'width .3s ease' }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: c.navyMute }}>
          {idx + 1} / {total}
        </span>
      </div>

      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: c.amber, marginBottom: 14 }}>
        Question {idx + 1}
      </div>
      <h2 style={{ fontSize: 22, lineHeight: 1.32, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-.01em' }}>{q.prompt}</h2>
      <p style={{ fontSize: 13.5, color: c.navyMute, margin: '0 0 22px', fontWeight: 600 }}>{q.hint ?? 'Tap the correct option.'}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {q.options.map((opt, i) => {
          const on = selected === i
          return (
            <button
              key={i}
              onClick={() => select(i)}
              style={{
                textAlign: 'left',
                background: on ? c.blue : c.navy2,
                border: on ? `2px solid ${c.blueLight}` : `1.5px solid #232D5C`,
                borderRadius: 16,
                padding: '17px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                boxShadow: on ? '0 8px 20px -8px rgba(110,140,234,.5)' : undefined,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: on ? c.blueLight : 'transparent',
                  border: on ? 'none' : '1.5px solid #333E70',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: on ? 900 : 800,
                  fontSize: 14,
                  color: on ? c.navy : c.navyMute,
                  flex: 'none',
                }}
              >
                {letters[i]}
              </div>
              <span style={{ fontSize: 16, fontWeight: on ? 700 : 600, fontFamily: serif, color: on ? '#fff' : c.navyText }}>{opt}</span>
            </button>
          )
        })}
      </div>

      <button
        onClick={next}
        disabled={selected === null}
        style={{
          width: '100%',
          background: c.amber,
          color: c.navy,
          border: 'none',
          borderRadius: 16,
          padding: 18,
          fontSize: 16,
          fontWeight: 800,
          fontFamily: 'inherit',
          marginTop: 'auto',
          opacity: selected === null ? 0.5 : 1,
        }}
      >
        {idx + 1 >= total ? 'Finish test →' : 'Next question →'}
      </button>
    </PhoneFrame>
  )
}
