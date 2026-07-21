import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../components/PhoneFrame'
import { Btn, Diamond } from '../components/ui'
import { useApp, type Goal } from '../state/AppContext'
import { c, serif } from '../theme'

const options: { key: Goal; title: string; sub: string }[] = [
  { key: 'board', title: 'Board readiness', sub: 'Class 10 boards are 7 months away' },
  { key: 'weak-subject', title: 'Fix a weak subject', sub: 'Target Maths specifically' },
  { key: 'habit', title: 'Build a study habit', sub: 'Consistency over cramming' },
]

// Screen 03 — Goal & identity. You become the auditor (SDT: autonomy + identity).
export default function OnboardGoal() {
  const nav = useNavigate()
  const { child, goal, setGoal } = useApp()

  return (
    <PhoneFrame contentStyle={{ padding: '22px 26px 26px', color: c.ink }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 22 }}>
        <div style={{ height: 5, flex: 1, background: c.blue, borderRadius: 3 }} />
        <div style={{ height: 5, flex: 1, background: c.blue, borderRadius: 3 }} />
        <div style={{ height: 5, flex: 1, background: c.line3, borderRadius: 3 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: c.ink3, marginLeft: 6 }}>2 / 3</span>
      </div>

      <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 29, lineHeight: 1.1, letterSpacing: '-.01em', margin: '0 0 4px' }}>
        What matters most
        <br />
        for {child.name} right now?
      </h2>
      <p style={{ fontSize: 14.5, color: c.ink2, margin: '0 0 22px', fontWeight: 500 }}>Pick one. You can change it any time.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {options.map((o) => {
          const on = goal === o.key
          return (
            <button
              key={o.key}
              onClick={() => setGoal(o.key)}
              style={{
                textAlign: 'left',
                border: on ? `2px solid ${c.blue}` : `1.5px solid ${c.line3}`,
                background: on ? c.blueWash : c.white,
                borderRadius: 16,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: on ? c.blue : 'transparent',
                  border: on ? 'none' : `2px solid #D8CFC0`,
                  flex: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: c.white,
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                {on ? '✓' : ''}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{o.title}</div>
                <div style={{ fontSize: 13, color: c.ink2, fontWeight: 500 }}>{o.sub}</div>
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 'auto', background: 'linear-gradient(135deg,#1E1B16,#2C271E)', borderRadius: 20, padding: '24px 22px', color: c.cream, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -20, width: 110, height: 110, border: '1.5px solid #E0A02033', borderRadius: '50%' }} />
        <div style={{ marginBottom: 16 }}>
          <Diamond size={44} bg={c.amber} ring={c.ink} />
        </div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: c.amber }}>Your new role</p>
        <p style={{ fontFamily: serif, fontSize: 23, lineHeight: 1.2, margin: '8px 0 0', fontWeight: 500 }}>
          You&apos;re now {child.name}&apos;s independent learning auditor.
        </p>
      </div>

      <Btn style={{ marginTop: 16, fontWeight: 700 }} onClick={() => nav('/audit/intro')}>
        Create {child.name}&apos;s first audit →
      </Btn>
    </PhoneFrame>
  )
}
