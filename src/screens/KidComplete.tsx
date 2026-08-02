import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../components/PhoneFrame'
import { useApp } from '../state/AppContext'
import { c, serif } from '../theme'

// Screen 06 — Kid finish (peak-end). Strong finisher + competence signal.
// Every claim here is measured: the answered count comes from the run that just
// finished, and the pace/trend card only appears when the engine actually has
// the data to back it. Never "you improved" on a first test.
export default function KidComplete() {
  const nav = useNavigate()
  const { child, answered, report } = useApp()
  const total = answered

  // The one real trend we can measure across tests is readiness velocity, and
  // it only exists once there's more than one test AND enough weeks of data.
  const velocity = report.velocityPtsPerWeek
  const climbing = report.testsTaken > 1 && velocity != null && velocity > 0
  // Pace is a plain fact about this history ("About 41s per question") — not a
  // comparison, so it's safe on test 1 as long as the engine says it has data.
  const speed = report.ratings.speed

  const signal = climbing
    ? { icon: '⚡', title: 'You’re getting stronger week on week', sub: `+${velocity} readiness points a week` }
    : speed.hasData
      ? { icon: '⏱', title: 'Your working pace', sub: speed.evidence }
      : {
          icon: '✓',
          title: report.testsTaken > 1 ? `That’s ${report.testsTaken} tests on the record` : 'That’s one test on the record',
          sub: 'A few more and we can show you how you’re changing.',
        }

  const confetti = [
    { top: 80, left: 60, w: 9, h: 9, bg: c.amber, r: 2, rot: 20 },
    { top: 130, right: 56, w: 12, h: 12, bg: c.blueLight, r: 50, rot: 0 },
    { top: 200, left: 44, w: 8, h: 8, bg: c.navyText, r: 2, rot: 45 },
    { top: 110, right: 96, w: 7, h: 7, bg: c.amber, r: 50, rot: 0 },
  ]

  return (
    <PhoneFrame
      bg="radial-gradient(120% 80% at 50% 0%, #2354C7 0%, #161B3E 60%)"
      notch="#0D0F26"
      tint="light"
      time="9:55"
      battery={65}
      contentStyle={{ padding: '30px 30px 26px', color: c.navyText, alignItems: 'center', textAlign: 'center' }}
    >
      {confetti.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: p.top,
            left: p.left,
            right: p.right,
            width: p.w,
            height: p.h,
            background: p.bg,
            borderRadius: p.r,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}

      <div
        style={{
          marginTop: 56,
          width: 118,
          height: 118,
          borderRadius: '50%',
          background: c.amber,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'ppGlow 2.4s ease-in-out infinite',
        }}
      >
        <div style={{ fontSize: 52, fontWeight: 900, color: c.navy, lineHeight: 1 }}>✓</div>
      </div>

      <p style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: c.amber, margin: '32px 0 8px' }}>
        Test complete
      </p>
      <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 38, lineHeight: 1.05, margin: '0 0 14px' }}>
        Shabaash,
        <br />
        {child.name}!
      </h2>
      <p style={{ fontSize: 16, lineHeight: 1.5, color: c.navySoft, margin: '0 0 28px', fontWeight: 500, maxWidth: 280 }}>
        {total > 0
          ? `You gave every question a real shot. All ${total} answered — no skips.`
          : 'You gave every question a real shot.'}
      </p>

      <div style={{ width: '100%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 18, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 'auto' }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: c.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: 22 }}>{signal.icon}</div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{signal.title}</div>
          <div style={{ fontSize: 13, color: c.navyMute, fontWeight: 600 }}>{signal.sub}</div>
        </div>
      </div>

      <div style={{ width: '100%', background: c.amberWash, borderRadius: 16, padding: '15px 18px', margin: '14px 0' }}>
        <p style={{ margin: 0, fontFamily: serif, fontStyle: 'italic', fontSize: 17, color: c.amberDark, fontWeight: 500 }}>
          &ldquo;Ab phone Ummi ko wapas do.&rdquo;
        </p>
      </div>

      <button
        onClick={() => nav('/diagnosis')}
        style={{ width: '100%', background: c.amber, color: c.navy, border: 'none', borderRadius: 16, padding: 18, fontSize: 16, fontWeight: 800, fontFamily: 'inherit' }}
      >
        Show Ummi the result →
      </button>
    </PhoneFrame>
  )
}
