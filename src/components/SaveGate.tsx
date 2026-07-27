import { useState, type CSSProperties } from 'react'
import { useApp } from '../state/AppContext'
import { useIsDesktop } from '../hooks/useBreakpoint'
import { waAccountLink } from '../shared/whatsapp'
import { WA_BUSINESS_NUMBER } from '../config'
import { Diamond } from './ui'
import { c, serif } from '../theme'

// The deferred sign-up gate. Guests use the whole app freely; this bottom sheet
// only appears at a moment of commitment (after a test, or a save action).
//
// On a phone the login IS WhatsApp: tapping "Continue with WhatsApp" opens the
// parent's own (already-verified) WhatsApp to message us — no password, no OTP,
// no typing a number. A manual number field stays as the desktop fallback.
export default function SaveGate() {
  const { saveGateOpen, closeSaveGate, claimAccount, child } = useApp()
  const isDesktop = useIsDesktop()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [manual, setManual] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!saveGateOpen) return null

  const validPhone = phone.replace(/\D/g, '').length >= 8

  // Phone path: open the parent's WhatsApp to us. Sending identifies them by
  // their verified number, so there's nothing to verify on the phone.
  function continueWithWhatsApp() {
    if (saving) return
    setSaving(true)
    const code = 'PP-' + Math.random().toString(36).slice(2, 7).toUpperCase()
    // Must open synchronously from the click to survive popup blockers.
    window.open(waAccountLink(WA_BUSINESS_NUMBER, child.name, code), '_blank', 'noopener')
    claimAccount(name, '', 'whatsapp').finally(() => setSaving(false))
  }

  // Desktop fallback: they type the number instead.
  async function saveManual() {
    if (!validPhone || saving) return
    setSaving(true)
    try {
      await claimAccount(name, phone, 'manual')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={isDesktop ? scrimCenter : scrim} onClick={closeSaveGate}>
      <div style={isDesktop ? modal : sheet} onClick={(e) => e.stopPropagation()}>
        {!isDesktop && <div style={{ width: 40, height: 4, background: c.line3, borderRadius: 3, margin: '0 auto 18px' }} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <Diamond size={40} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: c.amberDeep }}>
              Keep the record
            </div>
            <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 24, margin: '2px 0 0', lineHeight: 1.1 }}>
              Save {child.name}&apos;s progress
            </h2>
          </div>
        </div>
        <p style={{ margin: '0 0 18px', fontSize: 14, color: c.ink2, fontWeight: 500, lineHeight: 1.5 }}>
          Your WhatsApp is your login — no password, no OTP. Tap through and {child.name}&apos;s
          tests, diagnosis and reports land in your chat.
        </p>

        <label style={label}>Your name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya" style={input} />

        {!manual ? (
          <>
            <button onClick={continueWithWhatsApp} disabled={saving} style={waBtn(saving)}>
              <WaGlyph />
              {saving ? 'Opening WhatsApp…' : 'Continue with WhatsApp'}
            </button>
            <button onClick={() => setManual(true)} style={linkBtn}>
              On a computer? Enter your number instead
            </button>
          </>
        ) : (
          <>
            <label style={label}>WhatsApp number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="+91 —"
              autoFocus
              style={{ ...input, borderColor: validPhone ? c.blue : c.line3 }}
            />
            <button onClick={saveManual} disabled={!validPhone || saving} style={blueBtn(!validPhone || saving)}>
              {saving ? 'Saving…' : 'Save my progress'}
            </button>
            <button onClick={() => setManual(false)} style={linkBtn}>
              ← Use WhatsApp instead
            </button>
          </>
        )}

        <button onClick={closeSaveGate} style={{ ...linkBtn, color: c.ink3, marginTop: 2 }}>
          Not now — keep looking around
        </button>
        <p style={{ textAlign: 'center', fontSize: 11.5, color: c.ink4, margin: '8px 0 0', fontWeight: 600 }}>
          Your data stays yours · export or delete anytime · DPDP-compliant
        </p>
      </div>
    </div>
  )
}

function WaGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A2E1A" aria-hidden style={{ flex: 'none' }}>
      <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6c-.1.2-.3.3-.1.6.1.3.6 1.1 1.4 1.7 1 .9 1.7 1.1 2 1.2.2.1.4.1.5-.1l.6-.7c.2-.2.3-.2.6-.1l1.9.9c.3.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
    </svg>
  )
}

const scrim: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15,12,8,.5)',
  display: 'flex',
  alignItems: 'flex-end',
  zIndex: 40,
  animation: 'ppScrimIn .2s ease',
}
const scrimCenter: CSSProperties = {
  ...scrim,
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
}
const sheet: CSSProperties = {
  width: '100%',
  background: c.surface,
  borderRadius: '26px 26px 0 0',
  padding: '16px 24px 26px',
  boxShadow: '0 -20px 50px -20px rgba(0,0,0,.4)',
  animation: 'ppSlideUp .3s cubic-bezier(.2,.8,.2,1)',
}
const modal: CSSProperties = {
  width: '100%',
  maxWidth: 430,
  background: c.surface,
  borderRadius: 24,
  padding: '30px 30px 26px',
  boxShadow: '0 30px 70px -25px rgba(0,0,0,.5)',
  animation: 'ppPop .24s cubic-bezier(.2,.8,.2,1)',
}
const label: CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '.05em',
  textTransform: 'uppercase',
  color: c.ink3,
  margin: '0 0 6px',
}
const input: CSSProperties = {
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
const waBtn = (busy: boolean): CSSProperties => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  background: '#25D366',
  color: '#0A2E1A',
  border: 'none',
  borderRadius: 16,
  padding: 17,
  fontSize: 16,
  fontWeight: 800,
  fontFamily: 'inherit',
  marginTop: 6,
  opacity: busy ? 0.6 : 1,
  boxShadow: '0 10px 22px -10px rgba(37,211,102,.6)',
})
const blueBtn = (disabled: boolean): CSSProperties => ({
  width: '100%',
  background: c.blue,
  color: '#fff',
  border: 'none',
  borderRadius: 16,
  padding: 17,
  fontSize: 16,
  fontWeight: 800,
  fontFamily: 'inherit',
  marginTop: 6,
  opacity: disabled ? 0.5 : 1,
  boxShadow: '0 10px 22px -10px rgba(35,84,199,.6)',
})
const linkBtn: CSSProperties = {
  width: '100%',
  background: 'none',
  border: 'none',
  color: c.blue,
  fontSize: 13.5,
  fontWeight: 700,
  padding: '12px 0 2px',
  fontFamily: 'inherit',
  cursor: 'pointer',
}
