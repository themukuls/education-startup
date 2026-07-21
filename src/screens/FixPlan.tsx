import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { Btn } from '../components/ui'
import { useApp } from '../state/AppContext'
import { c, serif } from '../theme'

// Screen 09 — The Fix (prescription). Incomplete-task pull + scripted parent agency.
export default function FixPlan() {
  const nav = useNavigate()
  const { child } = useApp()

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
      <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 26, lineHeight: 1.1, margin: '0 0 14px' }}>Quadratic word problems</h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 8, background: '#EDE6DB', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ width: '33%', height: '100%', background: 'linear-gradient(90deg,#2354C7,#6E8CEA)', borderRadius: 5 }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: c.blue }}>1 / 3 done</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 20 }}>
        {/* Day 1 done */}
        <div style={{ background: c.blueWash, border: `1px solid ${c.blueBorder}`, borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 14, flex: 'none' }}>✓</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: c.blueDeep }}>Day 1 · Watch + 4 guided problems</div>
            <div style={{ fontSize: 12.5, color: c.blueMid, fontWeight: 600 }}>Completed yesterday · 14 min</div>
          </div>
        </div>
        {/* Day 2 current */}
        <button
          onClick={() => nav('/milestone')}
          style={{ textAlign: 'left', background: c.white, border: `2px solid ${c.amber}`, borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 13, boxShadow: '0 8px 18px -12px rgba(224,160,32,.6)' }}
        >
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.amber, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.navy, fontWeight: 900, fontSize: 14, flex: 'none' }}>2</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Day 2 · Practice set (6 problems)</div>
            <div style={{ fontSize: 12.5, color: c.amberDeep, fontWeight: 700 }}>Today · ~15 min · resume now</div>
          </div>
          <span style={{ color: c.amber, fontWeight: 900 }}>→</span>
        </button>
        {/* Day 3 locked */}
        <div style={{ background: c.white, border: `1px solid ${c.line2}`, borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 13, opacity: 0.65 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #D8CFC0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flex: 'none' }}>🔒</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: c.ink3 }}>Day 3 · Re-test the gap</div>
            <div style={{ fontSize: 12.5, color: c.ink4, fontWeight: 600 }}>Unlocks after Day 2 · Thursday</div>
          </div>
        </div>
      </div>

      {/* tonight, ask */}
      <div style={{ background: c.ink, borderRadius: 18, padding: '18px 20px', color: c.cream, marginBottom: 'auto' }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.amber, marginBottom: 12 }}>Tonight, ask {child.name}</div>
        <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 12, padding: '13px 15px', marginBottom: 10 }}>
          <p style={{ margin: 0, fontFamily: serif, fontSize: 16, lineHeight: 1.4, fontWeight: 500 }}>
            &ldquo;If a number plus its reciprocal is 10/3 — what&apos;s your <em>first</em> step before touching the formula?&rdquo;
          </p>
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: c.creamMute, fontWeight: 600 }}>
          You&apos;re checking if he can <b style={{ color: c.cream }}>set up</b> the equation — that&apos;s the exact gap.
        </p>
      </div>

      <Btn style={{ marginTop: 14, fontWeight: 800 }} onClick={() => nav('/milestone')}>
        Resume Day 2 →
      </Btn>
    </PhoneFrame>
  )
}
