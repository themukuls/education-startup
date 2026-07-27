import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { Btn } from '../components/ui'
import { useApp } from '../state/AppContext'
import { c, serif } from '../theme'

// Screen 09 — The Fix (prescription). Driven by the engine's chosen insight
// (report.headline) with a weakest-chapter fallback; no hardcoded metrics.
export default function FixPlan() {
  const nav = useNavigate()
  const { child, report } = useApp()

  const weakest = report.chapters[0] ?? null
  const hasChapter = weakest != null
  const pct = weakest ? Math.round(weakest.readiness * 100) : 0
  const headline = report.headline

  // The gap title + explanation come from the engine's insight when it picked
  // one; otherwise we derive gentle copy from the weakest chapter.
  const gapTitle = headline?.headline ?? (weakest ? weakest.chapter : 'Run a test to get the first fix')
  const gapDetail =
    headline?.detail ??
    (weakest
      ? `${weakest.chapter} is ${child.name}'s weakest chapter right now — sitting at ${pct}% ready. Close this one first for the fastest lift.`
      : `Run ${child.name}'s first test and we'll turn the weakest chapter into a step-by-step fix right here.`)

  const actionTonight =
    headline?.actionTonight ??
    (weakest
      ? `Ask ${child.name} to walk you through one ${weakest.chapter} problem out loud — listen for where the setup breaks.`
      : `Kick off a quick test so we can pinpoint the first thing worth fixing.`)

  const ourSide = weakest
    ? `We'll build ${child.name} a short practice set on ${weakest.chapter} and re-test the exact gap.`
    : `As soon as there's a test, we turn it into a targeted plan automatically.`

  return (
    <PhoneFrame
      time="7:32"
      contentStyle={{ padding: '18px 22px 86px', color: c.ink }}
      footer={<BottomNav active="fixes" />}
    >
      <button onClick={() => nav('/home')} style={{ display: 'flex', alignItems: 'center', gap: 8, color: c.ink3, fontSize: 14, fontWeight: 700, marginBottom: 14, background: 'none', border: 'none', padding: 0 }}>
        ← <span>The Fix</span>
      </button>

      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.red, marginBottom: 4 }}>Closing the gap</div>
      <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 26, lineHeight: 1.1, margin: '0 0 6px' }}>{gapTitle}</h2>

      {hasChapter && (
        <div style={{ fontSize: 13, fontWeight: 700, color: c.ink3, marginBottom: 14 }}>
          Weakest chapter · <span style={{ color: c.ink2 }}>{weakest!.chapter}</span> · <span style={{ color: c.blue }}>{pct}% ready</span>
        </div>
      )}

      {hasChapter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ flex: 1, height: 8, background: '#EDE6DB', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#2354C7,#6E8CEA)', borderRadius: 5 }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: c.blue }}>{pct}%</span>
        </div>
      )}

      {/* What the gap is */}
      <div style={{ background: c.white, border: `1px solid ${c.line2}`, borderRadius: 16, padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.ink3, marginBottom: 6 }}>What&apos;s going on</div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: c.ink2, fontWeight: 500 }}>{gapDetail}</p>
      </div>

      {/* tonight, ask */}
      <div style={{ background: c.ink, borderRadius: 18, padding: '18px 20px', color: c.cream, marginBottom: 'auto' }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.amber, marginBottom: 12 }}>Tonight, with {child.name}</div>
        <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 12, padding: '13px 15px', marginBottom: 10 }}>
          <p style={{ margin: 0, fontFamily: serif, fontSize: 16, lineHeight: 1.4, fontWeight: 500 }}>{actionTonight}</p>
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: c.creamMute, fontWeight: 600 }}>
          <b style={{ color: c.cream }}>Our side · </b>{ourSide}
        </p>
      </div>

      <Btn style={{ marginTop: 14, fontWeight: 800 }} onClick={() => nav(hasChapter ? '/milestone' : '/audit/intro')}>
        {hasChapter ? 'Start the fix →' : 'Run a test →'}
      </Btn>
    </PhoneFrame>
  )
}
