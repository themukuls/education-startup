import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../components/PhoneFrame'
import { Btn } from '../components/ui'
import { useApp } from '../state/AppContext'
import { c, serif } from '../theme'

// Screen 04 — The parent-led ritual. Trigger + supervised handoff ("Beta, aaj ka test de do").
export default function AuditIntro() {
  const nav = useNavigate()
  const { child } = useApp()
  const stats = [
    { n: '10', l: 'MINUTES' },
    { n: '9', l: 'QUESTIONS' },
    { n: String(child.subjects.length), l: 'SUBJECTS' },
  ]
  const points = [
    `Mapped to Class ${child.klass} ${child.board}, September syllabus`,
    'Timed & supervised — sit with him',
    'You get his Diagnosis Card the moment he’s done',
  ]
  return (
    <PhoneFrame time="7:30" contentStyle={{ padding: '22px 26px 26px', color: c.ink }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: c.amberDeep, marginBottom: 6 }}>
        Free audit · Day 1 of 7
      </div>
      <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 30, lineHeight: 1.08, letterSpacing: '-.01em', margin: '0 0 18px' }}>
        {child.name}&apos;s Board
        <br />
        Readiness Audit
      </h2>

      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        {stats.map((s) => (
          <div key={s.l} style={{ flex: 1, background: c.white, border: `1px solid ${c.line2}`, borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
            <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700 }}>{s.n}</div>
            <div style={{ fontSize: 11.5, color: c.ink3, fontWeight: 700, letterSpacing: '.03em' }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ background: c.blueWash, borderRadius: 16, padding: '18px 20px', marginBottom: 20 }}>
        <p style={{ margin: 0, fontFamily: serif, fontSize: 19, lineHeight: 1.35, color: c.blueDeep, fontWeight: 500 }}>
          This isn&apos;t a school test. No marks go anywhere. It just tells us the truth about what {child.name} really knows.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 'auto' }}>
        {points.map((p) => (
          <div key={p} style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
            <div style={{ width: 8, height: 8, background: c.blue, borderRadius: '50%', flex: 'none' }} />
            <span style={{ fontSize: 14, color: c.ink2, fontWeight: 600 }}>{p}</span>
          </div>
        ))}
      </div>

      <div style={{ background: c.amberWash, border: `1px dashed ${c.amber}`, borderRadius: 16, padding: '14px 18px', margin: '20px 0 14px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontFamily: serif, fontStyle: 'italic', fontSize: 18, color: c.amberDark, fontWeight: 500 }}>
          &ldquo;Beta, aaj ka test de do.&rdquo;
        </p>
      </div>

      <Btn glow style={{ padding: 19, fontSize: 16.5, fontWeight: 700 }} onClick={() => nav('/audit/test')}>
        Hand phone to {child.name} →
      </Btn>
    </PhoneFrame>
  )
}
