import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { useApp } from '../state/AppContext'
import { c, serif } from '../theme'

// Screen 08 — Parent home ★ daily anchor. "Where you left off" + one action + hero emotion.
export default function Home() {
  const nav = useNavigate()
  const { parentName, child, streak, report } = useApp()
  const readiness = report.readinessPct
  const weeklyDelta = Math.max(1, Math.round(report.velocityPtsPerWeek ?? 0))

  return (
    <PhoneFrame
      bg={c.home}
      time="7:30"
      contentStyle={{ padding: '16px 22px 86px', color: c.ink }}
      footer={<BottomNav active="home" />}
    >
      {/* greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 13, color: c.ink3, fontWeight: 700 }}>Good evening,</div>
          <div style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, lineHeight: 1 }}>{parentName}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: c.white, border: `1px solid ${c.line2}`, borderRadius: 22, padding: '6px 8px 6px 12px' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: c.amberDeep }}>🔥 {streak}</span>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: c.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 14 }}>
            {child.name[0]}
          </div>
        </div>
      </div>

      {/* hero emotion card */}
      <div style={{ background: 'linear-gradient(135deg,#2354C7,#163A8F)', borderRadius: 22, padding: '20px 22px', color: '#EBEFFB', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: -30, right: -20, width: 120, height: 120, border: '1px solid rgba(255,255,255,.1)', borderRadius: '50%' }} />
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', color: c.blueInk }}>{child.name.toUpperCase()} IS IMPROVING —</div>
        <p style={{ fontFamily: serif, fontSize: 24, lineHeight: 1.15, margin: '6px 0 16px', fontWeight: 500 }}>and you&apos;re the reason.</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <div>
            <div style={{ fontFamily: serif, fontSize: 40, fontWeight: 600, lineHeight: 1 }}>
              {readiness}
              <span style={{ fontSize: 20 }}>%</span>
            </div>
            <div style={{ fontSize: 11, color: c.blueInk, fontWeight: 700, letterSpacing: '.04em' }}>READINESS</div>
          </div>
          <div style={{ background: 'rgba(224,160,32,.22)', borderRadius: 20, padding: '6px 12px', marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#F3D08A' }}>↑ +{weeklyDelta} this week</span>
          </div>
        </div>
      </div>

      {/* pick up where you left off */}
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.ink3, marginBottom: 9 }}>
        Pick up where you left off
      </div>
      <div style={{ background: c.white, border: `1.5px solid ${c.amber}`, borderRadius: 18, padding: '17px 18px', marginBottom: 14, boxShadow: '0 8px 20px -12px rgba(224,160,32,.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em', color: c.amberDeep }}>TODAY · 15 MIN</span>
          <span style={{ background: c.amberWash, color: c.amberDark, fontSize: 11, fontWeight: 800, padding: '4px 9px', borderRadius: 12 }}>Day 2 of 3</span>
        </div>
        <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, lineHeight: 1.2, marginBottom: 4 }}>Quadratic word problems — practice set</div>
        <p style={{ margin: '0 0 14px', fontSize: 13.5, color: c.ink2, fontWeight: 600 }}>Sit with {child.name}. Then ask him tonight&apos;s question.</p>
        <button
          onClick={() => nav('/fix')}
          style={{ width: '100%', background: c.blue, color: '#fff', border: 'none', borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 800, fontFamily: 'inherit' }}
        >
          Continue the fix →
        </button>
      </div>

      {/* two small tiles */}
      <div style={{ display: 'flex', gap: 11 }}>
        <button onClick={() => nav('/term-audit')} style={tile}>
          <div style={{ fontSize: 12, color: c.ink3, fontWeight: 700, marginBottom: 4 }}>Next test</div>
          <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 600 }}>Thursday</div>
          <div style={{ fontSize: 12, color: c.blue, fontWeight: 700 }}>Re-test the gap</div>
        </button>
        <button onClick={() => nav('/upgrade')} style={tile}>
          <div style={{ fontSize: 12, color: c.ink3, fontWeight: 700, marginBottom: 4 }}>Free audit</div>
          <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 600 }}>Ends in 4d</div>
          <div style={{ fontSize: 12, color: c.red, fontWeight: 700 }}>Keep the record →</div>
        </button>
      </div>
    </PhoneFrame>
  )
}

const tile: React.CSSProperties = {
  flex: 1,
  textAlign: 'left',
  background: c.white,
  border: `1px solid ${c.line2}`,
  borderRadius: 16,
  padding: '14px 15px',
}
