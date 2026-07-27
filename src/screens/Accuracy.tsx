import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { useApp } from '../state/AppContext'
import { fetchAccuracy, enterMarks, fetchAggregateAccuracy, type AccuracyPayload, type AggregateAccuracy } from '../api/accuracy'
import { c, serif } from '../theme'

const EXAM_LABEL: Record<string, string> = {
  school_ut: 'Unit test',
  midterm: 'Mid-term',
  preboard: 'Pre-board',
  board: 'Board',
}
const EXAM_TYPES = ['school_ut', 'midterm', 'preboard', 'board']

// Prediction vs. actual — the trust ritual. Every school exam, the parent
// enters real marks; we check the prediction we ACTUALLY made, misses included.
export default function Accuracy() {
  const { child, childId } = useApp()
  const [data, setData] = useState<AccuracyPayload | null>(null)
  const [subject, setSubject] = useState(child.subjects[0] ?? 'Maths')
  const [examType, setExamType] = useState('school_ut')
  const [marks, setMarks] = useState('')
  const [saving, setSaving] = useState(false)
  const [agg, setAgg] = useState<AggregateAccuracy | null>(null)

  useEffect(() => {
    if (!childId) return
    let alive = true
    fetchAccuracy(childId)
      .then((d) => alive && setData(d))
      .catch(() => alive && setData(null))
    return () => {
      alive = false
    }
  }, [childId])

  useEffect(() => {
    let alive = true
    fetchAggregateAccuracy()
      .then((a) => alive && setAgg(a))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  async function submit() {
    const n = Number(marks)
    if (!Number.isFinite(n) || n < 0 || n > 100 || !childId) return
    setSaving(true)
    try {
      const updated = await enterMarks(childId, subject, examType, n)
      setData(updated)
      setMarks('')
    } catch {
      /* ignore */
    } finally {
      setSaving(false)
    }
  }

  const stats = data?.stats
  const hasRecord = !!stats && stats.n > 0

  return (
    <AppShell active="accuracy">
     <div style={{ maxWidth: 720, margin: '0 auto', color: c.ink }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.amberDeep, marginBottom: 4 }}>
        The trust ritual
      </div>
      <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 26, margin: '0 0 14px' }}>How accurate are we?</h2>

      {/* hero stat */}
      <div style={{ background: 'linear-gradient(135deg,#1E1B16,#2A251C)', borderRadius: 22, padding: '22px 22px 24px', color: c.cream, marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -24, right: -24, width: 120, height: 120, border: '1px solid #E0A02033', borderRadius: '50%' }} />
        {hasRecord ? (
          <>
            <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.blueInk }}>
              Predicted within ±8 points
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '8px 0 4px' }}>
              <div style={{ fontFamily: serif, fontSize: 52, fontWeight: 600, lineHeight: 1, color: c.amber }}>
                {stats!.within8Pct}
                <span style={{ fontSize: 24 }}>%</span>
              </div>
              <div style={{ fontSize: 14, color: c.creamMute, fontWeight: 600 }}>
                {stats!.within8} of {stats!.n} exams
              </div>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 13.5, color: c.creamMute, fontWeight: 500, lineHeight: 1.4 }}>
              Our readiness score matched {child.name}&apos;s real marks within 8 points — on your own exams, not our claims.
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.blueInk }}>The proof, coming</div>
            <p style={{ fontFamily: serif, fontSize: 20, lineHeight: 1.3, margin: '8px 0 0', fontWeight: 500 }}>
              Enter {child.name}&apos;s next school exam marks — then we check our prediction against it, honestly.
            </p>
          </>
        )}
      </div>

      {/* current live prediction */}
      {data && (
        <div style={{ background: c.white, border: `1px solid ${c.line2}`, borderRadius: 16, padding: '14px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: c.ink3, fontWeight: 700 }}>If boards were today</div>
            <div style={{ fontSize: 12, color: c.ink3, fontWeight: 500 }}>from current readiness {data.readiness}%</div>
          </div>
          <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: c.blueDeep }}>
            {data.currentBand.low}–{data.currentBand.high}%
          </div>
        </div>
      )}

      {/* the record — honest, misses included */}
      {hasRecord && (
        <>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.ink3, marginBottom: 9 }}>
            The record
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {[...data!.resolved].reverse().map((r, i) => {
              const ok = r.within8
              return (
                <div key={i} style={{ background: c.white, border: `1px solid ${ok ? c.line2 : c.redBorder}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>
                      {r.prediction.subject} · {EXAM_LABEL[r.prediction.examType] ?? r.prediction.examType}
                    </div>
                    <div style={{ fontSize: 12.5, color: c.ink3, fontWeight: 600 }}>
                      predicted {r.prediction.low}–{r.prediction.high}% · actual {r.actual}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: ok ? '#1E9E73' : c.red }}>
                      {ok ? '✓ within ±8' : `✗ off by ${r.absError}`}
                    </div>
                    <div style={{ fontSize: 11.5, color: c.ink3, fontWeight: 600 }}>{r.error > 0 ? `+${r.error}` : r.error} pts</div>
                  </div>
                </div>
              )
            })}
          </div>
          {stats!.n >= 2 && (
            <p style={{ fontSize: 12.5, color: c.ink2, fontWeight: 500, lineHeight: 1.5, margin: '0 0 16px', padding: '0 2px' }}>
              On average we&apos;ve been within <b>{stats!.meanAbsError}</b> points. We&apos;ve nudged future predictions by{' '}
              <b>{stats!.bias > 0 ? `+${stats!.bias}` : stats!.bias}</b> to stay honest.
            </p>
          )}
        </>
      )}

      {/* enter marks */}
      <div style={{ background: c.white, border: `1.5px solid ${c.blueBorder}`, borderRadius: 18, padding: '16px 18px', marginBottom: 'auto' }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Enter a real exam result</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} style={selectStyle}>
            {(child.subjects.length ? child.subjects : ['Maths']).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={examType} onChange={(e) => setExamType(e.target.value)} style={selectStyle}>
            {EXAM_TYPES.map((t) => (
              <option key={t} value={t}>{EXAM_LABEL[t]}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
            inputMode="numeric"
            placeholder="Marks %"
            style={{ flex: 1, border: `1.5px solid ${c.line3}`, borderRadius: 12, padding: '12px 14px', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', color: c.ink, outline: 'none', background: c.white }}
          />
          <button
            onClick={submit}
            disabled={saving || marks === ''}
            style={{ background: c.blue, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 18px', fontSize: 14, fontWeight: 800, fontFamily: 'inherit', opacity: saving || marks === '' ? 0.5 : 1 }}
          >
            {saving ? '…' : 'Check us'}
          </button>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 11.5, color: c.ink3, fontWeight: 500 }}>
          We compare it to the prediction we already made — and show you if we were wrong.
        </p>
      </div>

      {/* Cross-cohort social proof */}
      {agg && agg.predictions > 0 && (
        <div style={{ marginTop: 14, background: c.blueWash, border: `1px solid ${c.blueBorder}`, borderRadius: 16, padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, color: c.blue, lineHeight: 1 }}>{agg.within8Pct}%</div>
          <div style={{ fontSize: 13, color: c.blueDeep, fontWeight: 600, lineHeight: 1.4 }}>
            Across <b>{agg.children}</b> {agg.children === 1 ? 'child' : 'children'} and <b>{agg.predictions}</b> predictions, ParentProof has landed within ±8 points {agg.within8Pct}% of the time.
          </div>
        </div>
      )}
     </div>
    </AppShell>
  )
}

const selectStyle: React.CSSProperties = {
  flex: 1,
  border: `1.5px solid ${c.line3}`,
  borderRadius: 12,
  padding: '11px 12px',
  fontSize: 14,
  fontWeight: 700,
  fontFamily: 'inherit',
  color: c.ink,
  background: c.white,
  appearance: 'none',
}
