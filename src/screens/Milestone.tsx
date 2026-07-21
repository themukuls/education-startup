import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../components/PhoneFrame'
import { useApp } from '../state/AppContext'
import { c, serif } from '../theme'

// Screen 10 — Milestone moment. Identity + loss aversion, ethically (graceful freeze offered).
export default function Milestone() {
  const nav = useNavigate()
  const { streak } = useApp()

  return (
    <PhoneFrame
      bg="radial-gradient(115% 75% at 50% 8%, #E0A020 0%, #B36E17 40%, #7A4A0E 100%)"
      notch="#5E390A"
      tint="light"
      time="7:31"
      contentStyle={{ padding: '28px 30px 26px', color: '#FFF8EC', alignItems: 'center', textAlign: 'center' }}
    >
      <div style={{ marginTop: 40, position: 'relative', width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'ppFloat 3.4s ease-in-out infinite' }}>
        <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(255,248,236,.35)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 16, border: '1px solid rgba(255,248,236,.25)', borderRadius: '50%' }} />
        <div style={{ width: 104, height: 104, background: '#FFF8EC', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px -8px rgba(94,57,10,.6)' }}>
          <div style={{ fontFamily: serif, fontSize: 44, fontWeight: 700, color: c.amberDeep, lineHeight: 1 }}>{streak}</div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', color: c.amberDark }}>MONDAYS</div>
        </div>
      </div>

      <p style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', color: '#FBEFD9', margin: '34px 0 10px' }}>Milestone unlocked</p>
      <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 36, lineHeight: 1.05, margin: '0 0 16px' }}>
        {streak} Mondays.
        <br />
        Never missed one.
      </h2>
      <p style={{ fontSize: 16, lineHeight: 1.5, color: '#FBEBCE', margin: '0 0 26px', fontWeight: 500, maxWidth: 290 }}>
        You&apos;ve become the parent who <em style={{ fontFamily: serif }}>checks</em> — not the one who hopes. Mukul knows Monday is test day now.
      </p>

      <div style={{ width: '100%', background: 'rgba(255,248,236,.14)', border: '1px solid rgba(255,248,236,.28)', borderRadius: 18, padding: '16px 20px', marginBottom: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, color: '#FFF8EC' }}>₹0</div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#FFF8EC' }}>extra spent this month</div>
          <div style={{ fontSize: 12.5, color: '#FBEBCE', fontWeight: 600 }}>Just 15 min/day and your attention.</div>
        </div>
      </div>

      <button
        onClick={() => nav('/term-audit')}
        style={{ width: '100%', background: c.ink, color: '#FFF8EC', border: 'none', borderRadius: 16, padding: 18, fontSize: 16, fontWeight: 800, fontFamily: 'inherit', marginBottom: 12 }}
      >
        Keep it alive — next test Monday
      </button>
      <button
        onClick={() => alert('Streak frozen while you’re away — no penalty.')}
        style={{ background: 'none', border: 'none', fontSize: 13.5, color: '#FBEBCE', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }}
      >
        Going on holiday? Freeze the streak
      </button>
    </PhoneFrame>
  )
}
