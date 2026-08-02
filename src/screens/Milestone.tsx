import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../components/PhoneFrame'
import { useApp } from '../state/AppContext'
import { c, serif } from '../theme'

// Screen 10 — Milestone moment. Identity, earned honestly: the count is the
// child's real completed-test count (report.testsTaken via `streak`), and the
// screen degrades to an early-days variant when there is no milestone yet.
export default function Milestone() {
  const nav = useNavigate()
  const { child, streak, report } = useApp()

  // A milestone needs something to celebrate. 0 or 1 test is "early days".
  const early = streak < 2
  const plural = streak === 1 ? 'test' : 'tests'
  const name = child.name || 'your child'

  const eyebrow = streak === 0 ? 'Nothing measured yet' : early ? 'The record has started' : 'Milestone unlocked'

  const title = streak === 0 ? (
    <>
      No tests yet.
      <br />
      One starts the record.
    </>
  ) : early ? (
    <>
      First test done.
      <br />
      The record is open.
    </>
  ) : (
    <>
      {streak} {plural}.
      <br />
      All on the record.
    </>
  )

  const body =
    streak === 0
      ? `Run ${name}'s first test and this page starts keeping score — with numbers that come from their answers, not from us.`
      : early
        ? `One test in, we can already see where ${name} stands. A few more and the pattern gets sharp enough to act on.`
        : `${streak} ${plural} on the record — every number on this app comes from ${name}'s own answers.`

  return (
    <PhoneFrame
      bg="radial-gradient(115% 75% at 50% 8%, #E0A020 0%, #B36E17 40%, #7A4A0E 100%)"
      notch="#5E390A"
      tint="light"
      time="7:31"
      contentStyle={{ padding: '28px 30px 26px', color: '#FFF8EC', alignItems: 'center', textAlign: 'center' }}
    >
      <div style={{ marginTop: 40, position: 'relative', width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'ppFloat 3.4s ease-in-out infinite' }}>
        <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(255,248,236,.35)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 16, border: '1px solid rgba(255,248,236,.25)', borderRadius: '50%' }} />
        <div style={{ width: 104, height: 104, background: '#FFF8EC', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px -8px rgba(94,57,10,.6)' }}>
          <div style={{ fontFamily: serif, fontSize: 44, fontWeight: 700, color: c.amberDeep, lineHeight: 1 }}>{streak}</div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', color: c.amberDark }}>{plural.toUpperCase()}</div>
        </div>
      </div>

      <p style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', color: '#FBEFD9', margin: '34px 0 10px' }}>{eyebrow}</p>
      <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 36, lineHeight: 1.05, margin: '0 0 16px' }}>
        {title}
      </h2>
      <p style={{ fontSize: 16, lineHeight: 1.5, color: '#FBEBCE', margin: '0 0 26px', fontWeight: 500, maxWidth: 290 }}>
        {early ? body : (
          <>
            You&apos;ve become the parent who <em style={{ fontFamily: serif }}>checks</em> — not the one who hopes. {body}
          </>
        )}
      </p>

      {/* Was a "₹0 extra spent this month" claim we never measure. Now the one
          number we do own: readiness, and what it was measured from. */}
      <div style={{ width: '100%', background: 'rgba(255,248,236,.14)', border: '1px solid rgba(255,248,236,.28)', borderRadius: 18, padding: '16px 20px', marginBottom: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, color: '#FFF8EC' }}>
          {streak > 0 ? `${report.readinessPct}%` : '—'}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#FFF8EC' }}>
            {streak > 0 ? 'readiness, measured' : 'readiness, once you test'}
          </div>
          <div style={{ fontSize: 12.5, color: '#FBEBCE', fontWeight: 600 }}>
            {streak > 0 ? `From ${streak} completed ${plural} — no guesswork.` : 'Nothing is scored until they answer.'}
          </div>
        </div>
      </div>

      <button
        onClick={() => nav(streak === 0 ? '/audit/intro' : '/term-audit')}
        style={{ width: '100%', background: c.ink, color: '#FFF8EC', border: 'none', borderRadius: 16, padding: 18, fontSize: 16, fontWeight: 800, fontFamily: 'inherit' }}
      >
        {streak === 0 ? 'Start the first test →' : 'See the term audit →'}
      </button>
      {/* The "freeze the streak" link was an alert() promising a feature that
          doesn't exist. Removed: there is no schedule to miss and no freeze to
          store — the count is simply how many tests have been completed. */}
    </PhoneFrame>
  )
}
