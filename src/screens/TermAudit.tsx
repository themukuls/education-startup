import PhoneFrame from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { useApp } from '../state/AppContext'
import { c, serif } from '../theme'

const bars = [
  { label: 'W1', val: 54, h: 54, color: '#E7DFD2', text: c.ink2, bold: false },
  { label: 'W2', val: 58, h: 58, color: '#CBB98F', text: c.ink2, bold: false },
  { label: 'W3', val: 61, h: 61, color: '#8CA0E4', text: c.ink2, bold: false },
  { label: 'W4', val: 68, h: 68, color: c.blue, text: c.blue, bold: true },
]

// Screen 11 — Term Audit ★ the killer artifact. Longitudinal ledger — "is your ₹X working?"
export default function TermAudit() {
  const { child } = useApp()
  const spend = child.monthlySpend.toLocaleString('en-IN')

  return (
    <PhoneFrame
      time="7:34"
      contentStyle={{ padding: '16px 22px 86px', color: c.ink }}
      footer={<BottomNav active="progress" />}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.ink3 }}>September Term Audit</div>
        <span style={{ fontSize: 12, color: c.ink3, fontWeight: 700 }}>{child.name} · Cl {child.klass}</span>
      </div>

      {/* trajectory chart */}
      <div style={{ background: c.white, border: `1px solid ${c.line2}`, borderRadius: 18, padding: 18, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: c.ink2 }}>Readiness trajectory</span>
          <span style={{ background: c.blueWash, color: c.blue, fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 12 }}>↑ Improving</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
          {bars.map((b) => (
            <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, justifyContent: 'flex-end', height: '100%' }}>
              <div style={{ width: '100%', background: b.color, borderRadius: '8px 8px 3px 3px', height: `${b.h}%` }} />
              <span style={{ fontSize: 11, fontWeight: b.bold ? 800 : 700, color: b.bold ? c.blue : c.ink3 }}>{b.label}</span>
              <span style={{ fontSize: 12, fontWeight: b.bold ? 900 : 800, color: b.text }}>{b.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* the question you paid for */}
      <div style={{ background: 'linear-gradient(135deg,#1E1B16,#2A251C)', borderRadius: 18, padding: '18px 20px', color: c.cream, marginBottom: 14 }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.blueInk, marginBottom: 6 }}>The question you actually paid for</div>
        <p style={{ fontFamily: serif, fontSize: 20, lineHeight: 1.25, margin: '0 0 14px', fontWeight: 500 }}>Is your ₹{spend}/month working?</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(110,140,234,.14)', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, color: c.blueLight }}>Yes</div>
          <div style={{ fontSize: 13, color: c.navyBright, fontWeight: 600, lineHeight: 1.35 }}>
            +14 readiness points this term, driven by the gap you closed at home — not new fees.
          </div>
        </div>
      </div>

      {/* predicted + gaps */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 'auto' }}>
        <div style={{ flex: 1, background: c.blueWash, borderRadius: 14, padding: '14px 15px' }}>
          <div style={{ fontSize: 11.5, color: c.blueMid, fontWeight: 800, marginBottom: 4 }}>PREDICTED BOARDS</div>
          <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: c.blueDeep }}>72–80%</div>
          <div style={{ fontSize: 11.5, color: c.blueMid, fontWeight: 600 }}>±8% band</div>
        </div>
        <div style={{ flex: 1, background: c.white, border: `1px solid ${c.line2}`, borderRadius: 14, padding: '14px 15px' }}>
          <div style={{ fontSize: 11.5, color: c.ink3, fontWeight: 800, marginBottom: 4 }}>GAPS CLOSED</div>
          <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700 }}>2 of 3</div>
          <div style={{ fontSize: 11.5, color: c.amberDeep, fontWeight: 700 }}>1 in progress</div>
        </div>
      </div>

      <button
        onClick={() => alert('Term Audit ready to share with the tuition teacher')}
        style={{ width: '100%', background: c.ink, color: c.surface, border: 'none', borderRadius: 16, padding: 17, fontSize: 15.5, fontWeight: 800, fontFamily: 'inherit', marginTop: 14 }}
      >
        Show this to {child.name}&apos;s tuition teacher
      </button>
    </PhoneFrame>
  )
}
