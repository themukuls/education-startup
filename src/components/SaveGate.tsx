import { useState, type CSSProperties } from 'react'
import { useApp } from '../state/AppContext'
import { Diamond } from './ui'
import { c, serif } from '../theme'

// The deferred sign-up gate. Guests use the whole app freely; this bottom sheet
// only appears at a moment of commitment (after a test, or a save action) and
// asks for the minimum — phone + name. No password, skippable. Full auth later.
export default function SaveGate() {
  const { saveGateOpen, closeSaveGate, claimAccount, child } = useApp()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  if (!saveGateOpen) return null

  const validPhone = phone.replace(/\D/g, '').length >= 8

  async function save() {
    if (!validPhone || saving) return
    setSaving(true)
    try {
      await claimAccount(name, phone)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={scrim} onClick={closeSaveGate}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: c.line3, borderRadius: 3, margin: '0 auto 18px' }} />
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
          Enter your number so {child.name}&apos;s tests, diagnosis and streak stay yours. No password — we&apos;ll text you the report.
        </p>

        <label style={label}>Your name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya" style={input} />

        <label style={label}>WhatsApp number</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          placeholder="+91 —"
          style={{ ...input, borderColor: validPhone ? c.blue : c.line3 }}
        />

        <button
          onClick={save}
          disabled={!validPhone || saving}
          style={{
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
            opacity: !validPhone || saving ? 0.5 : 1,
            boxShadow: '0 10px 22px -10px rgba(35,84,199,.6)',
          }}
        >
          {saving ? 'Saving…' : 'Save my progress'}
        </button>
        <button
          onClick={closeSaveGate}
          style={{ width: '100%', background: 'none', border: 'none', color: c.ink3, fontSize: 14, fontWeight: 700, padding: '14px 0 2px', fontFamily: 'inherit' }}
        >
          Not now — keep looking around
        </button>
        <p style={{ textAlign: 'center', fontSize: 11.5, color: c.ink4, margin: '8px 0 0', fontWeight: 600 }}>
          Your data stays yours · export or delete anytime · DPDP-compliant
        </p>
      </div>
    </div>
  )
}

const scrim: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(15,12,8,.5)',
  display: 'flex',
  alignItems: 'flex-end',
  zIndex: 40,
  animation: 'ppScrimIn .2s ease',
}
const sheet: CSSProperties = {
  width: '100%',
  background: c.surface,
  borderRadius: '26px 26px 0 0',
  padding: '16px 24px 26px',
  boxShadow: '0 -20px 50px -20px rgba(0,0,0,.4)',
  animation: 'ppSlideUp .3s cubic-bezier(.2,.8,.2,1)',
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
