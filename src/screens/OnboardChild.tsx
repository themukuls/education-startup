import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../components/PhoneFrame'
import { Btn } from '../components/ui'
import { useApp } from '../state/AppContext'
import { c, serif } from '../theme'

function Steps({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 22 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ height: 5, flex: 1, background: i < step ? c.blue : c.line3, borderRadius: 3 }} />
      ))}
      <span style={{ fontSize: 12, fontWeight: 700, color: c.ink3, marginLeft: 6 }}>{step} / 3</span>
    </div>
  )
}

const label = {
  fontSize: 12.5,
  fontWeight: 800,
  letterSpacing: '.05em',
  textTransform: 'uppercase' as const,
  color: c.ink3,
}

// Screen 02 — Build your child's profile. Endowment: you create it in session 1.
export default function OnboardChild() {
  const nav = useNavigate()
  const { child, setChild } = useApp()

  const allSubjects = ['Maths', 'Science', 'English', 'SST']
  const toggleSubject = (s: string) => {
    const has = child.subjects.includes(s)
    setChild({ subjects: has ? child.subjects.filter((x) => x !== s) : [...child.subjects, s] })
  }

  const spendPct = Math.min(100, (child.monthlySpend / 20000) * 100)

  return (
    <PhoneFrame contentStyle={{ padding: '22px 26px 26px', color: c.ink }}>
      <Steps step={1} />
      <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 29, lineHeight: 1.1, letterSpacing: '-.01em', margin: '0 0 4px' }}>
        Who are we auditing?
      </h2>
      <p style={{ fontSize: 14.5, color: c.ink2, margin: '0 0 22px', fontWeight: 500 }}>
        A few basics — we map tests to your child&apos;s exact syllabus position.
      </p>

      <label style={{ ...label, marginBottom: 7, display: 'block' }}>Child&apos;s name</label>
      <input
        value={child.name}
        onChange={(e) => setChild({ name: e.target.value })}
        placeholder="e.g. Aarav"
        autoFocus
        style={{
          border: `1.5px solid ${c.blue}`,
          borderRadius: 14,
          padding: '15px 16px',
          fontSize: 16,
          fontWeight: 700,
          background: c.white,
          marginBottom: 16,
          width: '100%',
          fontFamily: 'inherit',
          color: c.ink,
          outline: 'none',
        }}
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ ...label, marginBottom: 7, display: 'block' }}>Board</label>
          <div style={{ border: `1.5px solid ${c.line3}`, borderRadius: 14, padding: '15px 16px', fontSize: 15, fontWeight: 700, background: c.white, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {child.board} <span style={{ color: c.ink4 }}>▾</span>
          </div>
        </div>
        <div style={{ width: 112 }}>
          <label style={{ ...label, marginBottom: 7, display: 'block' }}>Class</label>
          <div style={{ border: `1.5px solid ${c.line3}`, borderRadius: 14, padding: '15px 16px', fontSize: 15, fontWeight: 700, background: c.white, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {child.klass} <span style={{ color: c.ink4 }}>▾</span>
          </div>
        </div>
      </div>

      <label style={{ ...label, marginBottom: 9, display: 'block' }}>Subjects to track</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 20 }}>
        {allSubjects.map((s) => {
          const on = child.subjects.includes(s)
          return (
            <button
              key={s}
              onClick={() => toggleSubject(s)}
              style={{
                background: on ? c.blue : c.white,
                border: on ? 'none' : `1.5px solid ${c.line3}`,
                color: on ? c.white : c.ink3,
                fontSize: 14,
                fontWeight: 700,
                padding: '9px 15px',
                borderRadius: 22,
              }}
            >
              {s} {on ? '✓' : '+'}
            </button>
          )
        })}
      </div>

      <label style={{ ...label, marginBottom: 4, display: 'block' }}>Monthly tuition / coaching spend</label>
      <p style={{ fontSize: 12.5, color: c.amberDeep, margin: '0 0 12px', fontWeight: 700 }}>
        We&apos;ll show you if it&apos;s actually working.
      </p>
      <div style={{ background: c.white, border: `1.5px solid ${c.line3}`, borderRadius: 16, padding: '16px 18px', marginBottom: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <span style={{ fontSize: 14, color: c.ink2, fontWeight: 600 }}>₹0</span>
          <span style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: c.ink }}>
            ₹{child.monthlySpend.toLocaleString('en-IN')}
            <span style={{ fontSize: 14, color: c.ink3 }}>/mo</span>
          </span>
          <span style={{ fontSize: 14, color: c.ink2, fontWeight: 600 }}>₹20k+</span>
        </div>
        <input
          type="range"
          min={0}
          max={20000}
          step={500}
          value={child.monthlySpend}
          onChange={(e) => setChild({ monthlySpend: Number(e.target.value) })}
          style={{ width: '100%', accentColor: c.amberDeep }}
          aria-label="Monthly spend"
        />
        <div style={{ height: 6, background: '#EDE6DB', borderRadius: 4, position: 'relative', marginTop: 4 }}>
          <div style={{ width: `${spendPct}%`, height: '100%', background: c.amberDeep, borderRadius: 4 }} />
        </div>
      </div>

      <Btn
        style={{ marginTop: 16, fontWeight: 700, opacity: child.name.trim() ? 1 : 0.45 }}
        disabled={!child.name.trim()}
        onClick={() => nav('/onboarding/goal')}
      >
        Continue →
      </Btn>
    </PhoneFrame>
  )
}
