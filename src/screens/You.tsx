import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { useApp } from '../state/AppContext'
import { c, serif } from '../theme'

// Screen 13 — You & your children (control). Parent-as-owner + DPDP consent + add-child.
export default function You() {
  const nav = useNavigate()
  const { parentName, parentInitial, child } = useApp()
  const [appearance, setAppearance] = useState<'Light' | 'Dark'>('Light')
  const [lang, setLang] = useState<'EN' | 'हिं'>('EN')

  return (
    <PhoneFrame
      bg={c.home}
      time="7:42"
      contentStyle={{ padding: '18px 22px 86px', color: c.ink }}
      footer={<BottomNav active="you" />}
    >
      <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 27, lineHeight: 1.1, margin: '0 0 16px' }}>You &amp; your children</h2>

      {/* account owner */}
      <div style={{ background: c.blue, borderRadius: 18, padding: '16px 18px', color: '#EBEFFB', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', background: c.amber, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: c.navy, fontSize: 18, flex: 'none' }}>{parentInitial}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{parentName} Sharma</div>
          <div style={{ fontSize: 12.5, color: c.blueInk, fontWeight: 700 }}>Account owner · you control all data</div>
        </div>
        <span style={{ background: 'rgba(255,255,255,.16)', borderRadius: 10, padding: '5px 10px', fontSize: 11, fontWeight: 800 }}>Core</span>
      </div>

      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.ink3, marginBottom: 9 }}>Children</div>
      <div style={{ background: c.white, border: `1px solid ${c.line2}`, borderRadius: 16, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 13 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: c.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', flex: 'none' }}>{child.name[0]}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{child.name}</div>
          <div style={{ fontSize: 12.5, color: c.ink3, fontWeight: 600 }}>Class {child.klass} {child.board} · {child.subjects.join(', ')}</div>
        </div>
        <span style={{ color: c.ink4, fontWeight: 700 }}>›</span>
      </div>
      <button
        onClick={() => alert('Add a sibling — Family add-on (+₹499 / child)')}
        style={{ width: '100%', textAlign: 'left', background: 'none', border: '1.5px dashed #CBBFA9', borderRadius: 16, padding: '14px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 13 }}
      >
        <div style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid #CBBFA9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.ink4, fontSize: 22, flex: 'none' }}>+</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: c.ink2 }}>Add a sibling</div>
          <div style={{ fontSize: 12.5, color: c.ink3, fontWeight: 600 }}>Family add-on · +₹499 / child</div>
        </div>
      </button>

      {/* DPDP consent */}
      <div style={{ background: c.white, border: `1px solid ${c.blueBorder}`, borderRadius: 16, padding: '15px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: c.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 12 }}>✓</div>
          <span style={{ fontSize: 14, fontWeight: 800 }}>Parental consent — DPDP Act 2023</span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: c.ink2, fontWeight: 600, lineHeight: 1.4 }}>
          Verified for {child.name} (minor). You can export or permanently delete his data at any time.
        </p>
        <div style={{ display: 'flex', gap: 9 }}>
          <button onClick={() => alert('Exporting ' + child.name + '’s data…')} style={{ flex: 1, textAlign: 'center', background: c.home, border: 'none', borderRadius: 11, padding: 9, fontSize: 12.5, fontWeight: 800, color: c.ink2 }}>Export data</button>
          <button onClick={() => alert('This permanently deletes all of ' + child.name + '’s data.')} style={{ flex: 1, textAlign: 'center', background: c.redWash, border: 'none', borderRadius: 11, padding: 9, fontSize: 12.5, fontWeight: 800, color: c.red }}>Delete data</button>
        </div>
      </div>

      {/* settings list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: c.white, border: `1px solid ${c.line2}`, borderRadius: 16, overflow: 'hidden', marginBottom: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Appearance</span>
          <Toggle options={['Light', 'Dark']} value={appearance} onChange={(v) => setAppearance(v as 'Light' | 'Dark')} />
        </div>
        <div style={{ height: 1, background: c.divider }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Reminder time</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: c.blue }}>7:30 PM · after dinner</span>
        </div>
        <div style={{ height: 1, background: c.divider }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Language</span>
          <Toggle options={['EN', 'हिं']} value={lang} onChange={(v) => setLang(v as 'EN' | 'हिं')} />
        </div>
      </div>

      <button onClick={() => nav('/')} style={{ background: 'none', border: 'none', color: c.ink3, fontSize: 13.5, fontWeight: 700, marginTop: 16, textAlign: 'center' }}>
        Sign out
      </button>
    </PhoneFrame>
  )
}

function Toggle({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', background: '#EDE6DB', borderRadius: 20, padding: 3 }}>
      {options.map((o) => {
        const on = o === value
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            style={{
              background: on ? '#fff' : 'transparent',
              border: 'none',
              borderRadius: 16,
              padding: '5px 13px',
              fontSize: 12.5,
              fontWeight: on ? 800 : 700,
              color: on ? c.ink : c.ink3,
              boxShadow: on ? '0 1px 3px rgba(0,0,0,.1)' : undefined,
            }}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}
