import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../components/PhoneFrame'
import { Btn, Diamond } from '../components/ui'
import { useApp } from '../state/AppContext'
import { c, serif } from '../theme'

// Screen 01 — Value-first entry. Value before data capture, no sign-up to begin.
export default function Welcome() {
  const nav = useNavigate()
  const { child, openSaveGate } = useApp()
  return (
    <PhoneFrame contentStyle={{ padding: '44px 30px 26px', color: c.ink }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 'auto' }}>
        <Diamond size={26} />
        <span style={{ fontWeight: 800, fontSize: 16 }}>ParentProof</span>
      </div>

      <div style={{ margin: '32px 0' }}>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 800,
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: c.amberDeep,
            marginBottom: 18,
          }}
        >
          The neutral referee
        </div>
        <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 40, lineHeight: 1.05, letterSpacing: '-.02em', margin: 0 }}>
          You pay for their education.
          <br />
          <span style={{ color: c.blue }}>
            We prove whether
            <br />
            it&apos;s working.
          </span>
        </h2>
        <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 17, color: c.ink2, margin: '20px 0 0', lineHeight: 1.4 }}>
          &ldquo;Fees aap bharte ho. Report hum dete hain — asli wali.&rdquo;
        </p>
      </div>

      <div style={{ background: c.redWash, border: `1px solid ${c.redBorder}`, borderRadius: 16, padding: '16px 18px', marginBottom: 26 }}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: c.redInk, fontWeight: 600 }}>
          <span style={{ fontFamily: serif, fontSize: 26, fontWeight: 700, verticalAlign: -4, marginRight: 2 }}>55%</span>
          of Class 5 kids can&apos;t read a Class 2 text. Is yours one of them?
        </p>
      </div>

      <Btn glow style={{ padding: 19, fontSize: 16.5, fontWeight: 700 }} onClick={() => nav('/onboarding/child')}>
        Start {child.name}&apos;s free 7-day audit
      </Btn>
      <p style={{ textAlign: 'center', fontSize: 12.5, color: c.ink3, margin: '14px 0 20px', fontWeight: 600 }}>
        No sign-up needed to begin · 3 free tests
      </p>
      <p style={{ textAlign: 'center', fontSize: 14, color: c.ink2, margin: 0, fontWeight: 500 }}>
        Already auditing?{' '}
        <span onClick={openSaveGate} style={{ color: c.blue, fontWeight: 700, cursor: 'pointer' }}>
          Sign in
        </span>
      </p>
    </PhoneFrame>
  )
}
