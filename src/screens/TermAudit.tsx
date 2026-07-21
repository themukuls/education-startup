import PhoneFrame from '../components/PhoneFrame'
import BottomNav from '../components/BottomNav'
import { useApp } from '../state/AppContext'
import { c, serif } from '../theme'

const BAR_COLORS = ['#E7DFD2', '#CBB98F', '#8CA0E4', c.blue]

// Screen 11 — Term Audit ★ the killer artifact. Longitudinal ledger — "is your ₹X working?"
export default function TermAudit() {
  const { child, report } = useApp()
  const spend = child.monthlySpend.toLocaleString('en-IN')

  // real weekly trajectory from the engine (pad to 4 for the chart)
  const traj = report.trajectory.slice(-4)
  const tMin = Math.min(...traj)
  const tMax = Math.max(...traj)
  const bars = traj.map((val, i, arr) => {
    const last = i === arr.length - 1
    // rescale to 40–100% so small week-to-week gains read clearly
    const h = tMax > tMin ? 40 + ((val - tMin) / (tMax - tMin)) * 60 : 70
    return {
      label: `W${i + 1}`,
      val,
      h,
      color: BAR_COLORS[Math.min(i, BAR_COLORS.length - 1)],
      text: last ? c.blue : c.ink2,
      bold: last,
    }
  })
  const gain = traj.length >= 2 ? traj[traj.length - 1] - traj[0] : 0
  const working = gain > 0
  // predicted board band around current readiness, ±8
  const lo = Math.min(95, report.readinessPct + 4)
  const hi = Math.min(99, report.readinessPct + 12)
  const gapsClosed = report.chapters.filter((ch) => ch.readiness >= 0.75).length
  const gapsTotal = report.chapters.length

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
          <span style={{ background: working ? c.blueWash : c.amberWash, color: working ? c.blue : c.amberDeep, fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 12 }}>
            {working ? '↑ Improving' : '→ Holding'}
          </span>
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
          <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, color: c.blueLight }}>{working ? 'Yes' : 'Watch'}</div>
          <div style={{ fontSize: 13, color: c.navyBright, fontWeight: 600, lineHeight: 1.35 }}>
            {working
              ? `+${gain} readiness points this term, driven by the gap you closed at home — not new fees.`
              : `Readiness is flat this term — the fix plan is where to push next.`}
          </div>
        </div>
      </div>

      {/* predicted + gaps */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 'auto' }}>
        <div style={{ flex: 1, background: c.blueWash, borderRadius: 14, padding: '14px 15px' }}>
          <div style={{ fontSize: 11.5, color: c.blueMid, fontWeight: 800, marginBottom: 4 }}>PREDICTED BOARDS</div>
          <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: c.blueDeep }}>{lo}–{hi}%</div>
          <div style={{ fontSize: 11.5, color: c.blueMid, fontWeight: 600 }}>±8% band</div>
        </div>
        <div style={{ flex: 1, background: c.white, border: `1px solid ${c.line2}`, borderRadius: 14, padding: '14px 15px' }}>
          <div style={{ fontSize: 11.5, color: c.ink3, fontWeight: 800, marginBottom: 4 }}>ON TRACK</div>
          <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700 }}>{gapsClosed} of {gapsTotal}</div>
          <div style={{ fontSize: 11.5, color: c.amberDeep, fontWeight: 700 }}>chapters ≥ 75%</div>
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
