import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../components/PhoneFrame'
import { useApp } from '../state/AppContext'
import { c, serif } from '../theme'

// Screen 12 — Upgrade (free audit ends). Loss aversion + endowment; anchored pricing.
export default function Upgrade() {
  const nav = useNavigate()
  const { child, accountStatus, openSaveGate } = useApp()

  return (
    <PhoneFrame time="7:40" contentStyle={{ padding: '18px 22px 24px', color: c.ink }}>
      <div style={{ textAlign: 'right', marginBottom: 8 }}>
        <button onClick={() => nav('/home')} style={{ background: 'none', border: 'none', fontSize: 20, color: c.ink4, fontWeight: 400 }} aria-label="Close">✕</button>
      </div>

      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.red, marginBottom: 6 }}>Free audit ends in 4 days</div>
      <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 30, lineHeight: 1.08, margin: '0 0 12px' }}>
        Don&apos;t lose {child.name}&apos;s
        <br />
        record now.
      </h2>

      <div style={{ background: c.redWash, border: `1px solid ${c.redBorder}`, borderRadius: 16, padding: '15px 18px', marginBottom: 18 }}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: c.redInk, fontWeight: 600 }}>
          You&apos;ve already built <b>3 tests</b>, <b>1 diagnosis</b> and a <b>5-Monday streak</b>. Trajectory: <b>+14 points</b>. All of it resets if the audit lapses.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 'auto' }}>
        {/* Core */}
        <div style={{ position: 'relative', border: `2px solid ${c.blue}`, background: c.white, borderRadius: 18, padding: '17px 18px', boxShadow: '0 10px 24px -14px rgba(35,84,199,.6)' }}>
          <div style={{ position: 'absolute', top: -11, left: 18, background: c.blue, color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', padding: '4px 11px', borderRadius: 12 }}>MOST POPULAR</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>Core</div>
              <div style={{ fontSize: 13, color: c.ink2, fontWeight: 600 }}>Weekly tests · fix plans · dashboard · 2 subjects</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: serif, fontSize: 26, fontWeight: 700, color: c.blue }}>₹999</div>
              <div style={{ fontSize: 11.5, color: c.ink3, fontWeight: 700 }}>/ 6 months</div>
            </div>
          </div>
        </div>
        {/* Annual */}
        <div style={{ border: `1.5px solid ${c.line3}`, background: c.white, borderRadius: 18, padding: '17px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Annual</div>
              <span style={{ background: c.amberWash, color: c.amberDark, fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 10 }}>BEST VALUE</span>
            </div>
            <div style={{ fontSize: 13, color: c.ink2, fontWeight: 600 }}>All subjects · term audits · board predictor</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700 }}>₹1,799</div>
            <div style={{ fontSize: 11.5, color: c.ink3, fontWeight: 700 }}>/ year</div>
          </div>
        </div>
        {/* Free */}
        <div style={{ border: '1px dashed #D8CFC0', borderRadius: 18, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: c.ink3 }}>Free Audit</div>
            <div style={{ fontSize: 12.5, color: c.ink4, fontWeight: 600 }}>Ends Thursday</div>
          </div>
          <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: c.ink4 }}>₹0</div>
        </div>
      </div>

      <button
        onClick={() => {
          // guests must save their record (phone) before paying
          if (accountStatus === 'guest') {
            openSaveGate()
            return
          }
          alert('Welcome to Core — ' + child.name + '’s record is safe.')
          nav('/home')
        }}
        style={{ width: '100%', background: c.blue, color: '#fff', border: 'none', borderRadius: 16, padding: 19, fontSize: 16.5, fontWeight: 800, fontFamily: 'inherit', boxShadow: '0 10px 22px -8px rgba(35,84,199,.6)', marginTop: 16 }}
      >
        Keep {child.name}&apos;s record — ₹999
      </button>
      <p style={{ textAlign: 'center', fontSize: 12.5, color: c.ink3, margin: '12px 0 0', fontWeight: 600 }}>Cancel anytime · Your data stays yours · UPI / cards</p>
    </PhoneFrame>
  )
}
