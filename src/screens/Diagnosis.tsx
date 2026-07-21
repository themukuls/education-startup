import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../components/PhoneFrame'
import { useApp } from '../state/AppContext'
import { shareCard } from '../api/whatsapp'
import type { CardCopy } from '../shared/card'
import { c, serif } from '../theme'

// Screen 07 — Diagnosis Card ★ hero artifact. Variable reward + shareable social proof.
export default function Diagnosis() {
  const nav = useNavigate()
  const { child, parentPhone, lastScore } = useApp()
  const readiness = lastScore ?? 61

  // The shareable Diagnosis Card, as a WhatsApp message.
  const diagnosisCard: CardCopy = {
    headline: `${child.name}'s Maths — Quadratics: ${readiness}% ready`,
    body: 'Understands the concepts, but forms equations from word problems wrong — set up 3 of 4 incorrectly.',
    actionTonight: 'Word-problem → equation drills, 15 min a day.',
    ourSide: 'Re-test scheduled Thursday to prove it worked.',
    kidLine: 'Crack word problems this week for a streak bonus! 🔥',
  }

  return (
    <PhoneFrame time="9:56" contentStyle={{ padding: '16px 22px 24px', color: c.ink }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, background: c.blue, borderRadius: 5, transform: 'rotate(45deg)' }} />
          <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.ink3 }}>Diagnosis Card</span>
        </div>
        <span style={{ fontSize: 12.5, color: c.ink3, fontWeight: 700 }}>21 Sep 2026</span>
      </div>

      {/* hero score card */}
      <div style={{ background: 'linear-gradient(150deg,#1E1B16,#2A251C)', borderRadius: 22, padding: '22px 22px 24px', color: c.cream, position: 'relative', overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ position: 'absolute', top: -24, right: -24, width: 120, height: 120, border: '1px solid #E0A02033', borderRadius: '50%' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.creamMute }}>
              {child.name} · Class {child.klass} {child.board}
            </div>
            <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 500, marginTop: 2 }}>Maths — Quadratics</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: serif, fontSize: 46, fontWeight: 600, lineHeight: 1, color: c.amber }}>
              {readiness}
              <span style={{ fontSize: 22 }}>%</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: c.creamMute, letterSpacing: '.05em' }}>READINESS</div>
          </div>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,.12)', borderRadius: 5, marginTop: 18, overflow: 'hidden' }}>
          <div style={{ width: `${readiness}%`, height: '100%', background: 'linear-gradient(90deg,#C0492F,#E0A020)', borderRadius: 5 }} />
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 14, fontWeight: 700, color: c.cream }}>
          On track — but there&apos;s one <span style={{ color: c.amber }}>real gap</span>.
        </p>
      </div>

      {/* understood vs memorised */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, background: c.blueWash, borderRadius: 14, padding: '13px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: c.blue, marginBottom: 6 }}>✓ TRULY UNDERSTANDS</div>
          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, color: c.blueDeep }}>Linear equations · Real numbers · Factorising</div>
        </div>
        <div style={{ flex: 1, background: c.redWash, borderRadius: 14, padding: '13px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: c.red, marginBottom: 6 }}>! MEMORISED ONLY</div>
          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, color: c.redInk2 }}>Recites the quadratic formula — can&apos;t apply it</div>
        </div>
      </div>

      {/* the specific gap */}
      <div style={{ background: c.white, border: `1.5px solid ${c.redBorder}`, borderRadius: 16, padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.red, marginBottom: 8 }}>The specific gap</div>
        <p style={{ margin: 0, fontFamily: serif, fontSize: 18, lineHeight: 1.35, color: c.ink, fontWeight: 500 }}>
          Forming equations from word problems. His arithmetic was right — but he set up 3 of 4 word problems wrong.
        </p>
      </div>

      {/* the fix */}
      <div style={{ background: c.blue, borderRadius: 16, padding: '15px 18px', marginBottom: 'auto', color: '#EBEFFB' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: c.blueInk }}>Your 15-min/day fix</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: c.amber }}>3 days →</span>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 14.5, fontWeight: 600, lineHeight: 1.4 }}>
          Word-problem → equation drills. Re-test scheduled <b style={{ color: '#fff' }}>Thursday</b> to prove it worked.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button
          onClick={() =>
            shareCard(
              diagnosisCard,
              { childName: child.name, subject: 'Maths', chapter: 'Quadratics', readinessPct: readiness },
              parentPhone,
            )
          }
          style={{ flex: 1, background: '#25D366', color: '#0A2E1A', border: 'none', borderRadius: 15, padding: 16, fontSize: 15, fontWeight: 800, fontFamily: 'inherit' }}
        >
          Share on WhatsApp
        </button>
        <button
          onClick={() => nav('/home')}
          style={{ flex: 1, background: c.white, color: c.blue, border: `1.5px solid ${c.blueBorder}`, borderRadius: 15, padding: 16, fontSize: 15, fontWeight: 800, fontFamily: 'inherit' }}
        >
          Start the fix →
        </button>
      </div>
    </PhoneFrame>
  )
}
