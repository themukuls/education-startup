import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../components/PhoneFrame'
import { useApp } from '../state/AppContext'
import { renderCard } from '../api/card'
import { shareCard } from '../api/whatsapp'
import { fallbackCard, type CardCopy, type RenderRequest } from '../shared/card'
import { c, serif } from '../theme'

/** A chapter counts as understood once the engine's readiness clears this bar. */
const UNDERSTOOD_AT = 0.7
/** How many chapter names each tile lists before it stops. */
const MAX_TILE_ITEMS = 3

// Screen 07 — Diagnosis Card ★ hero artifact. Variable reward + shareable social proof.
// Every number and claim on this screen comes from the deterministic engine's
// LearningReport; the LLM only rephrases the prose (guardrailed in shared/card).
export default function Diagnosis() {
  const nav = useNavigate()
  const { child, parentPhone, lastScore, report, accountStatus, afterTestPrompted, openSaveGate, markAfterTestPrompted } = useApp()
  const { chapters, headline, readinessPct, coldStart, testsTaken } = report

  // Engine-owned readiness (blueprint-weighted), NOT the raw last test score.
  const readiness = readinessPct
  const childName = child.name || 'Your child'
  const subject = child.subjects[0] ?? 'Maths'
  // chapters are sorted weakest-first by the engine.
  const weakest = chapters[0] ?? null
  const focusChapter = weakest?.chapter ?? null
  const weakestPct = weakest ? Math.round(weakest.readiness * 100) : 0
  const hasSignal = headline != null || weakest != null

  const understands = [...chapters]
    .filter((ch) => ch.readiness >= UNDERSTOOD_AT)
    .sort((a, b) => b.readiness - a.readiness)
    .slice(0, MAX_TILE_ITEMS)
    .map((ch) => ch.chapter)
  // roteFlag === 'ROTE' is exactly the engine's "recalls it, can't apply it" gap.
  const memorised = chapters
    .filter((ch) => ch.roteFlag === 'ROTE')
    .slice(0, MAX_TILE_ITEMS)
    .map((ch) => ch.chapter)

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  // They just finished a test and got a real result — the moment to offer saving
  // it. Guests only, once per session, and only after actually taking the test.
  useEffect(() => {
    if (accountStatus === 'guest' && lastScore != null && !afterTestPrompted) {
      markAfterTestPrompted()
      const t = setTimeout(openSaveGate, 1400)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountStatus, lastScore, afterTestPrompted])

  // The render request carries the engine's own strings — they are both the
  // safe fallback and the only facts the model is allowed to rephrase.
  const renderReq: RenderRequest = headline
    ? {
        childName,
        subject,
        chapter: focusChapter ?? subject,
        polarity: headline.polarity,
        finding: headline.headline,
        detail: headline.detail,
        actionTonight: headline.actionTonight,
      }
    : {
        childName,
        subject,
        chapter: focusChapter ?? subject,
        polarity: weakest && weakest.readiness < UNDERSTOOD_AT ? 'negative' : 'positive',
        finding: weakest
          ? coldStart
            ? `First read on ${weakest.chapter}.`
            : `${weakest.chapter} is the lowest chapter right now.`
          : `${childName}'s first audit.`,
        detail: weakest
          ? coldStart
            ? `${testsTaken} test${testsTaken === 1 ? '' : 's'} in, ${weakest.chapter} sits at ${weakestPct}% ready — an early read, not a verdict.`
            : `${weakest.chapter} sits at ${weakestPct}% ready. Closing this one first gives the fastest lift.`
          : `No answers on record yet, so there is nothing to diagnose.`,
        actionTonight: weakest
          ? `Ask ${childName} to talk you through one ${weakest.chapter} question out loud — listen for where the setup breaks.`
          : `Run the first test so there is something real to work from.`,
      }

  // Show the engine's own copy instantly, then swap in the LLM's phrasing if it
  // arrives. The card therefore always renders, online or not.
  const [card, setCard] = useState<CardCopy>(() => fallbackCard(renderReq))
  useEffect(() => {
    setCard(fallbackCard(renderReq))
    if (!hasSignal) return
    let alive = true
    renderCard(renderReq).then((r) => {
      if (alive) setCard(r.card)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headline?.metric, focusChapter, weakestPct, coldStart, hasSignal, childName])

  const gapLabel = headline ? 'The specific gap' : coldStart ? 'The first read' : 'What we can see'

  return (
    <PhoneFrame time="9:56" contentStyle={{ padding: '16px 22px 24px', color: c.ink }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, background: c.blue, borderRadius: 5, transform: 'rotate(45deg)' }} />
          <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.ink3 }}>Diagnosis Card</span>
        </div>
        <span style={{ fontSize: 12.5, color: c.ink3, fontWeight: 700 }}>{today}</span>
      </div>

      {/* hero score card */}
      <div style={{ background: 'linear-gradient(150deg,#1E1B16,#2A251C)', borderRadius: 22, padding: '22px 22px 24px', color: c.cream, position: 'relative', overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ position: 'absolute', top: -24, right: -24, width: 120, height: 120, border: '1px solid #E0A02033', borderRadius: '50%' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.creamMute }}>
              {child.name} · Class {child.klass} {child.board}
            </div>
            <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 500, marginTop: 2 }}>
              {focusChapter ? `${subject} — ${focusChapter}` : subject}
            </div>
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
          {headline ? (
            headline.polarity === 'negative' ? (
              <>
                On track — but there&apos;s one <span style={{ color: c.amber }}>real gap</span>.
              </>
            ) : (
              <>
                One thing is <span style={{ color: c.amber }}>clearly working</span>.
              </>
            )
          ) : coldStart ? (
            <>
              First audit — the picture <span style={{ color: c.amber }}>sharpens with each test</span>.
            </>
          ) : weakest ? (
            <>
              Lowest chapter right now: <span style={{ color: c.amber }}>{weakest.chapter}</span>.
            </>
          ) : (
            <>
              No test on record yet — <span style={{ color: c.amber }}>run the first one</span>.
            </>
          )}
        </p>
      </div>

      {/* understood vs memorised — both derived from the chapter ledger */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, background: c.blueWash, borderRadius: 14, padding: '13px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: c.blue, marginBottom: 6 }}>✓ TRULY UNDERSTANDS</div>
          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, color: understands.length ? c.blueDeep : c.ink3 }}>
            {understands.length ? understands.join(' · ') : 'No chapter clears the bar yet'}
          </div>
        </div>
        <div style={{ flex: 1, background: c.redWash, borderRadius: 14, padding: '13px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: c.red, marginBottom: 6 }}>! MEMORISED ONLY</div>
          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, color: memorised.length ? c.redInk2 : c.ink3 }}>
            {memorised.length ? `${memorised.join(' · ')} — recalled, not applied` : 'Nothing flagged as memorised-only'}
          </div>
        </div>
      </div>

      {/* the specific gap — the engine's chosen insight, phrased by the LLM */}
      <div style={{ background: c.white, border: `1.5px solid ${c.redBorder}`, borderRadius: 16, padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.red, marginBottom: 8 }}>{gapLabel}</div>
        <p style={{ margin: 0, fontFamily: serif, fontSize: 18, lineHeight: 1.35, color: c.ink, fontWeight: 500 }}>
          {card.headline} {card.body}
        </p>
      </div>

      {/* the fix */}
      <div style={{ background: c.blue, borderRadius: 16, padding: '15px 18px', marginBottom: 'auto', color: '#EBEFFB' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: c.blueInk }}>Your 15-min/day fix</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: c.amber }}>Tonight →</span>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 14.5, fontWeight: 600, lineHeight: 1.4 }}>{card.actionTonight}</p>
        <p style={{ margin: '8px 0 0', fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, color: c.blueInk }}>
          <b style={{ color: '#fff' }}>Our side · </b>
          {card.ourSide}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button
          onClick={() =>
            shareCard(
              card,
              { childName: child.name, subject, chapter: focusChapter ?? undefined, readinessPct: readiness },
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
