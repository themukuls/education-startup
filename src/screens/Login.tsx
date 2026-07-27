import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../components/PhoneFrame'
import { Diamond } from '../components/ui'
import { startLogin, verifyLogin } from '../api/auth'
import { c, serif } from '../theme'

// Cross-device sign-in. Enter the WhatsApp number on the account → we send a
// 6-digit code → entering it signs this device into that existing account.
export default function Login() {
  const nav = useNavigate()
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [devCode, setDevCode] = useState('')

  const validPhone = phone.replace(/\D/g, '').length >= 8

  async function sendCode() {
    if (!validPhone || busy) return
    setBusy(true)
    setError('')
    try {
      const r = await startLogin(phone)
      setDevCode(r.devCode ?? '')
      setStep('code')
    } catch {
      setError('Could not send a code. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function verify() {
    if (code.trim().length < 4 || busy) return
    setBusy(true)
    setError('')
    try {
      await verifyLogin(phone, code.trim())
      // token swapped — reload so the app re-hydrates into this account
      window.location.assign('#/home')
      window.location.reload()
    } catch (err) {
      setError(String((err as Error).message || 'Wrong or expired code.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PhoneFrame contentStyle={{ padding: '40px 30px 26px', color: c.ink }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <Diamond size={26} />
        <span style={{ fontWeight: 800, fontSize: 16 }}>ParentProof</span>
      </div>

      <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 30, lineHeight: 1.1, margin: '0 0 8px' }}>
        {step === 'phone' ? 'Welcome back' : 'Enter your code'}
      </h2>
      <p style={{ fontSize: 14.5, color: c.ink2, fontWeight: 500, lineHeight: 1.5, margin: '0 0 24px' }}>
        {step === 'phone'
          ? 'Sign in with the WhatsApp number on your account. We’ll send you a 6-digit code.'
          : `We sent a code to ${phone}. Enter it below to continue.`}
      </p>

      {step === 'phone' ? (
        <>
          <label style={label}>WhatsApp number</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+91 —" autoFocus style={{ ...input, borderColor: validPhone ? c.blue : c.line3 }} />
          <button onClick={sendCode} disabled={!validPhone || busy} style={primary(!validPhone || busy)}>
            {busy ? 'Sending…' : 'Send code'}
          </button>
        </>
      ) : (
        <>
          <label style={label}>6-digit code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="––––––"
            autoFocus
            style={{ ...input, letterSpacing: '.4em', fontSize: 22, textAlign: 'center' }}
          />
          {devCode && (
            <div style={{ background: c.amberWash, border: `1px solid ${c.amber}`, borderRadius: 10, padding: '9px 12px', margin: '-4px 0 14px', fontSize: 12.5, fontWeight: 700, color: c.amberDark }}>
              🧪 Dev mode: your code is <b>{devCode}</b> (WhatsApp not configured)
            </div>
          )}
          <button onClick={verify} disabled={code.trim().length < 4 || busy} style={primary(code.trim().length < 4 || busy)}>
            {busy ? 'Signing in…' : 'Verify & sign in'}
          </button>
          <button onClick={() => { setStep('phone'); setCode(''); setError('') }} style={linkBtn}>
            ← Use a different number
          </button>
        </>
      )}

      {error && <p style={{ color: c.red, fontSize: 13, fontWeight: 700, margin: '14px 0 0', textAlign: 'center' }}>{error}</p>}

      <p style={{ textAlign: 'center', fontSize: 14, color: c.ink2, margin: 'auto 0 0', fontWeight: 500 }}>
        New here?{' '}
        <span onClick={() => nav('/')} style={{ color: c.blue, fontWeight: 700, cursor: 'pointer' }}>
          Start a free audit
        </span>
      </p>
    </PhoneFrame>
  )
}

const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: c.ink3, margin: '0 0 6px' }
const input: React.CSSProperties = {
  width: '100%',
  border: `1.5px solid ${c.line3}`,
  borderRadius: 14,
  padding: '14px 16px',
  fontSize: 16,
  fontWeight: 700,
  fontFamily: 'inherit',
  color: c.ink,
  background: c.white,
  outline: 'none',
  marginBottom: 14,
}
const primary = (disabled: boolean): React.CSSProperties => ({
  width: '100%',
  background: c.blue,
  color: '#fff',
  border: 'none',
  borderRadius: 16,
  padding: 17,
  fontSize: 16,
  fontWeight: 800,
  fontFamily: 'inherit',
  opacity: disabled ? 0.5 : 1,
  boxShadow: '0 10px 22px -10px rgba(35,84,199,.6)',
})
const linkBtn: React.CSSProperties = { width: '100%', background: 'none', border: 'none', color: c.ink3, fontSize: 13.5, fontWeight: 700, padding: '12px 0 0', fontFamily: 'inherit', cursor: 'pointer' }
