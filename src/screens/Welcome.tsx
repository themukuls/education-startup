import { useNavigate } from 'react-router-dom'
import type { CSSProperties } from 'react'
import SaveGate from '../components/SaveGate'
import { Diamond } from '../components/ui'
import { useApp } from '../state/AppContext'
import { useIsDesktop } from '../hooks/useBreakpoint'
import { c, serif } from '../theme'

// Screen 01 — the front door. On a phone it's a clean full-screen value pitch;
// on laptop/desktop it's a real marketing landing page (hero, proof, how it
// works, pricing, CTA). Value before data capture — no sign-up to begin.
export default function Welcome() {
  const nav = useNavigate()
  const { child } = useApp()
  const isDesktop = useIsDesktop()
  const start = () => nav('/onboarding/child')

  return (
    <div style={{ minHeight: '100dvh', background: c.paperHi, color: c.ink, overflowX: 'hidden' }}>
      {/* ---- Nav bar ---- */}
      <header style={navBar(isDesktop)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Diamond size={28} />
          <span style={{ fontWeight: 800, fontSize: 17 }}>ParentProof</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: isDesktop ? 22 : 12 }}>
          {isDesktop && (
            <span onClick={() => nav('/login')} style={{ color: c.ink2, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Sign in
            </span>
          )}
          <button onClick={start} style={navCta}>
            Start free audit
          </button>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section style={container(isDesktop)}>
        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1.05fr 0.95fr' : '1fr', gap: isDesktop ? 56 : 30, alignItems: 'center', padding: isDesktop ? '56px 0 40px' : '30px 0 8px' }}>
          <div>
            <div style={eyebrow}>The neutral referee</div>
            <h1 style={{ fontFamily: serif, fontWeight: 600, fontSize: isDesktop ? 58 : 38, lineHeight: 1.03, letterSpacing: '-.02em', margin: '18px 0 0' }}>
              You pay for their education.{' '}
              <span style={{ color: c.blue }}>We prove whether it&apos;s working.</span>
            </h1>
            <p style={{ fontFamily: serif, fontStyle: 'italic', fontSize: isDesktop ? 20 : 17, color: c.ink2, margin: '22px 0 0', lineHeight: 1.4, maxWidth: 520 }}>
              &ldquo;Fees aap bharte ho. Report hum dete hain — asli wali.&rdquo;
            </p>
            <p style={{ fontSize: isDesktop ? 17 : 15, color: c.ink2, margin: '20px 0 28px', lineHeight: 1.55, maxWidth: 520, fontWeight: 500 }}>
              An independent 15-minute audit tells you what your child has truly understood versus
              only memorised — then hands you a 15-min/day fix and re-tests to prove it worked.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <button onClick={start} style={heroCta}>
                Start {child.name || 'your child'}&apos;s free 7-day audit
              </button>
              <span style={{ fontSize: 13, color: c.ink3, fontWeight: 600 }}>No sign-up needed · 3 free tests</span>
            </div>
          </div>

          {/* sample diagnosis card visual */}
          <SampleCard isDesktop={isDesktop} childName={child.name || 'Aarav'} />
        </div>
      </section>

      {/* ---- Proof band ---- */}
      <section style={{ background: c.redWash, borderTop: `1px solid ${c.redBorder}`, borderBottom: `1px solid ${c.redBorder}` }}>
        <div style={{ ...container(isDesktop), padding: isDesktop ? '34px 40px' : '24px 22px', display: 'flex', alignItems: 'center', gap: isDesktop ? 22 : 14, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: serif, fontSize: isDesktop ? 52 : 40, fontWeight: 700, color: c.red, lineHeight: 1 }}>55%</span>
          <p style={{ margin: 0, fontSize: isDesktop ? 19 : 15.5, lineHeight: 1.4, color: c.redInk, fontWeight: 600, flex: 1, minWidth: 240 }}>
            of Class 5 children in India can&apos;t read a Class 2 text (ASER). Marks hide it. An
            independent audit doesn&apos;t. <b>Is yours one of them?</b>
          </p>
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section style={{ ...container(isDesktop), padding: isDesktop ? '64px 40px 20px' : '40px 22px 10px' }}>
        <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: isDesktop ? 34 : 26, margin: '0 0 6px', textAlign: isDesktop ? 'center' : 'left' }}>
          How the audit works
        </h2>
        <p style={{ color: c.ink3, fontWeight: 600, fontSize: 15, margin: '0 0 30px', textAlign: isDesktop ? 'center' : 'left' }}>
          Three steps. Fifteen minutes. Proof either way.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3,1fr)' : '1fr', gap: isDesktop ? 22 : 14 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={stepCard}>
              <div style={stepNum}>{i + 1}</div>
              <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, margin: '4px 0 6px' }}>{s.title}</div>
              <p style={{ margin: 0, fontSize: 14.5, color: c.ink2, fontWeight: 500, lineHeight: 1.5 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Pricing / final CTA ---- */}
      <section style={{ ...container(isDesktop), padding: isDesktop ? '56px 40px 40px' : '36px 22px 24px' }}>
        <div style={{ background: 'linear-gradient(135deg,#2354C7,#163A8F)', borderRadius: 26, padding: isDesktop ? '46px 48px' : '30px 24px', color: '#EBEFFB', display: 'grid', gridTemplateColumns: isDesktop ? '1.3fr 1fr' : '1fr', gap: 26, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: isDesktop ? 36 : 27, margin: 0, lineHeight: 1.1, color: '#fff' }}>
              Start free. Keep the record for ₹999 / 6 months.
            </h2>
            <p style={{ margin: '14px 0 0', fontSize: 15.5, color: c.blueInk, fontWeight: 600, lineHeight: 1.5 }}>
              The free 7-day audit gives you a full diagnosis. Core keeps weekly tests, fix plans and
              the longitudinal record going — cancel anytime, your data stays yours.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={start} style={{ ...heroCta, width: '100%', background: c.amber, color: c.navy }}>
              Start {child.name || 'your child'}&apos;s free audit
            </button>
            <button onClick={() => nav('/login')} style={{ width: '100%', background: 'rgba(255,255,255,.12)', color: '#fff', border: '1px solid rgba(255,255,255,.3)', borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 800, fontFamily: 'inherit' }}>
              I already have an audit
            </button>
          </div>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer style={{ ...container(isDesktop), padding: isDesktop ? '20px 40px 40px' : '14px 22px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, color: c.ink3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Diamond size={20} />
          <span style={{ fontWeight: 800, fontSize: 14, color: c.ink2 }}>ParentProof</span>
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>Independent learning audits · DPDP-compliant · Made for Indian parents</span>
      </footer>

      <SaveGate />
    </div>
  )
}

const STEPS = [
  { title: 'Your child takes a 15-min test', body: 'Adaptive questions from their exact syllabus. It measures what they understand, not what they can recite.' },
  { title: 'You get a Diagnosis Card', body: 'Understood vs memorised, the one real gap, and a readiness score — in plain language, on WhatsApp.' },
  { title: 'A 15-min/day fix, then a re-test', body: 'A specific plan for the gap, and a scheduled re-test that proves whether it actually closed.' },
]

function SampleCard({ isDesktop, childName }: { isDesktop: boolean; childName: string }) {
  return (
    <div style={{ background: 'linear-gradient(150deg,#1E1B16,#2A251C)', borderRadius: 24, padding: isDesktop ? '26px 26px 28px' : '22px', color: c.cream, position: 'relative', overflow: 'hidden', boxShadow: '0 30px 60px -25px rgba(40,33,22,.5)', maxWidth: isDesktop ? 'none' : 440, margin: isDesktop ? 0 : '0 auto', width: '100%' }}>
      <div style={{ position: 'absolute', top: -24, right: -24, width: 130, height: 130, border: '1px solid #E0A02033', borderRadius: '50%' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: c.creamMute }}>{childName} · Class 10 CBSE</div>
          <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 500, marginTop: 2 }}>Maths — Quadratics</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: serif, fontSize: 46, fontWeight: 600, lineHeight: 1, color: c.amber }}>
            61<span style={{ fontSize: 22 }}>%</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: c.creamMute, letterSpacing: '.05em' }}>READINESS</div>
        </div>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,.12)', borderRadius: 5, marginTop: 18, overflow: 'hidden' }}>
        <div style={{ width: '61%', height: '100%', background: 'linear-gradient(90deg,#C0492F,#E0A020)', borderRadius: 5 }} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <div style={{ flex: 1, background: 'rgba(230,236,250,.1)', borderRadius: 12, padding: '11px 12px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', color: c.blueInk, marginBottom: 4 }}>✓ UNDERSTANDS</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.3 }}>Linear equations · Factorising</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(196,73,47,.16)', borderRadius: 12, padding: '11px 12px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', color: '#E7A08A', marginBottom: 4 }}>! MEMORISED</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.3 }}>Recites formula — can&apos;t apply it</div>
        </div>
      </div>
      <p style={{ margin: '16px 0 0', fontSize: 13.5, fontWeight: 600, color: c.cream, lineHeight: 1.4 }}>
        Sets up word problems wrong — 3 of 4. <span style={{ color: c.amber }}>Fixable in 3 days.</span>
      </p>
    </div>
  )
}

const navBar = (isDesktop: boolean): CSSProperties => ({
  position: 'sticky',
  top: 0,
  zIndex: 20,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: isDesktop ? '16px 40px' : '14px 20px',
  maxWidth: 1160,
  margin: '0 auto',
  width: '100%',
  background: 'rgba(240,234,221,.86)',
  backdropFilter: 'blur(8px)',
})
const container = (isDesktop: boolean): CSSProperties => ({
  maxWidth: 1160,
  margin: '0 auto',
  padding: isDesktop ? '0 40px' : '0 20px',
  width: '100%',
})
const eyebrow: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 800,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  color: c.amberDeep,
}
const navCta: CSSProperties = {
  background: c.blue,
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: '10px 16px',
  fontSize: 14,
  fontWeight: 800,
  fontFamily: 'inherit',
}
const heroCta: CSSProperties = {
  background: c.blue,
  color: '#fff',
  border: 'none',
  borderRadius: 15,
  padding: '16px 22px',
  fontSize: 16.5,
  fontWeight: 800,
  fontFamily: 'inherit',
  boxShadow: '0 14px 30px -12px rgba(35,84,199,.7)',
}
const stepCard: CSSProperties = {
  background: c.white,
  border: `1px solid ${c.line2}`,
  borderRadius: 18,
  padding: '22px 22px 24px',
}
const stepNum: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  background: c.blueWash,
  color: c.blue,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 900,
  fontSize: 16,
  marginBottom: 8,
}
