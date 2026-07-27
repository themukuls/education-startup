import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useApp } from '../state/AppContext'
import { useIsDesktop } from '../hooks/useBreakpoint'
import { c, serif } from '../theme'

// Parent home ★ daily anchor. Single column on phone; a two-column dashboard on
// laptop/desktop (hero + continue on the left, the smaller tiles on the right).
export default function Home() {
  const nav = useNavigate()
  const { parentName, child, streak, report, accountStatus, openSaveGate, childId, accountReady, loadDemo } = useApp()
  const isDesktop = useIsDesktop()
  const [loadingDemo, setLoadingDemo] = useState(false)
  const keepRecord = () => (accountStatus === 'guest' ? openSaveGate() : nav('/upgrade'))
  const readiness = report.readinessPct
  const weeklyDelta = Math.max(1, Math.round(report.velocityPtsPerWeek ?? 0))

  // First run: the account has no child yet → onboard, or load demo data.
  if (accountReady && !childId) {
    const startDemo = async () => {
      if (loadingDemo) return
      setLoadingDemo(true)
      try {
        await loadDemo()
      } catch {
        setLoadingDemo(false)
      }
    }
    return (
      <AppShell active="home">
        <div style={{ maxWidth: 560, margin: '0 auto', padding: isDesktop ? '40px 0' : '24px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🎓</div>
          <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: isDesktop ? 34 : 27, lineHeight: 1.1, margin: '0 0 10px' }}>
            Let&apos;s audit your child&apos;s learning
          </h2>
          <p style={{ fontSize: 15.5, color: c.ink2, fontWeight: 500, lineHeight: 1.55, margin: '0 auto 26px', maxWidth: 420 }}>
            Create their profile and run a 15-minute audit. You&apos;ll see exactly what they&apos;ve truly
            understood versus only memorised — and a plan to fix the gap.
          </p>
          <button
            onClick={() => nav('/onboarding/child')}
            style={{ width: '100%', maxWidth: 340, background: c.blue, color: '#fff', border: 'none', borderRadius: 16, padding: 18, fontSize: 16.5, fontWeight: 800, fontFamily: 'inherit', boxShadow: '0 12px 26px -12px rgba(35,84,199,.7)' }}
          >
            Start the free audit →
          </button>
          <div style={{ marginTop: 16 }}>
            <button onClick={startDemo} disabled={loadingDemo} style={{ background: 'none', border: 'none', color: c.ink3, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit' }}>
              {loadingDemo ? 'Loading demo…' : 'Just exploring? Load demo data'}
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  const hero = (
    <div style={{ background: 'linear-gradient(135deg,#2354C7,#163A8F)', borderRadius: 22, padding: isDesktop ? '26px 28px' : '20px 22px', color: '#EBEFFB', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', bottom: -30, right: -20, width: 140, height: 140, border: '1px solid rgba(255,255,255,.1)', borderRadius: '50%' }} />
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', color: c.blueInk }}>{child.name.toUpperCase()} IS IMPROVING —</div>
      <p style={{ fontFamily: serif, fontSize: isDesktop ? 28 : 24, lineHeight: 1.15, margin: '6px 0 18px', fontWeight: 500 }}>and you&apos;re the reason.</p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        <div>
          <div style={{ fontFamily: serif, fontSize: isDesktop ? 52 : 40, fontWeight: 600, lineHeight: 1 }}>
            {readiness}
            <span style={{ fontSize: 22 }}>%</span>
          </div>
          <div style={{ fontSize: 11, color: c.blueInk, fontWeight: 700, letterSpacing: '.04em' }}>READINESS</div>
        </div>
        <div style={{ background: 'rgba(224,160,32,.22)', borderRadius: 20, padding: '6px 12px', marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#F3D08A' }}>↑ +{weeklyDelta} this week</span>
        </div>
      </div>
    </div>
  )

  const continueCard = (
    <div>
      <div style={sectionLabel}>Pick up where you left off</div>
      <div style={{ background: c.white, border: `1.5px solid ${c.amber}`, borderRadius: 18, padding: '17px 18px', boxShadow: '0 8px 20px -12px rgba(224,160,32,.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em', color: c.amberDeep }}>TODAY · 15 MIN</span>
          <span style={{ background: c.amberWash, color: c.amberDark, fontSize: 11, fontWeight: 800, padding: '4px 9px', borderRadius: 12 }}>Day 2 of 3</span>
        </div>
        <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, lineHeight: 1.2, marginBottom: 4 }}>Quadratic word problems — practice set</div>
        <p style={{ margin: '0 0 14px', fontSize: 13.5, color: c.ink2, fontWeight: 600 }}>Sit with {child.name}. Then ask him tonight&apos;s question.</p>
        <button onClick={() => nav('/fix')} style={{ width: '100%', background: c.blue, color: '#fff', border: 'none', borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 800, fontFamily: 'inherit' }}>
          Continue the fix →
        </button>
      </div>
    </div>
  )

  const tiles = (
    <div style={{ display: 'flex', flexDirection: isDesktop ? 'column' : 'row', gap: isDesktop ? 14 : 11 }}>
      <button onClick={() => nav('/term-audit')} style={tile}>
        <div style={{ fontSize: 12, color: c.ink3, fontWeight: 700, marginBottom: 4 }}>Next test</div>
        <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 600 }}>Thursday</div>
        <div style={{ fontSize: 12, color: c.blue, fontWeight: 700 }}>Re-test the gap</div>
      </button>
      <button onClick={keepRecord} style={tile}>
        <div style={{ fontSize: 12, color: c.ink3, fontWeight: 700, marginBottom: 4 }}>Free audit</div>
        <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 600 }}>Ends in 4d</div>
        <div style={{ fontSize: 12, color: c.red, fontWeight: 700 }}>{accountStatus === 'guest' ? 'Save the record →' : 'Keep the record →'}</div>
      </button>
    </div>
  )

  return (
    <AppShell active="home">
      {/* greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isDesktop ? 22 : 18 }}>
        <div>
          <div style={{ fontSize: 13, color: c.ink3, fontWeight: 700 }}>Good evening,</div>
          <div style={{ fontFamily: serif, fontSize: isDesktop ? 32 : 26, fontWeight: 600, lineHeight: 1 }}>{parentName}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: c.white, border: `1px solid ${c.line2}`, borderRadius: 22, padding: '6px 8px 6px 12px' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: c.amberDeep }}>🔥 {streak}</span>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: c.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 14 }}>
            {child.name[0]}
          </div>
        </div>
      </div>

      {isDesktop ? (
        <div className="pp-grid pp-grid-2">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {hero}
            {continueCard}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{tiles}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {hero}
          {continueCard}
          {tiles}
        </div>
      )}
    </AppShell>
  )
}

const sectionLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: c.ink3,
  marginBottom: 9,
}
const tile: React.CSSProperties = {
  flex: 1,
  textAlign: 'left',
  background: c.white,
  border: `1px solid ${c.line2}`,
  borderRadius: 16,
  padding: '15px 16px',
}
