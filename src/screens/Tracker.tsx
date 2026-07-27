import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useApp } from '../state/AppContext'
import type { Rating, RatingKey } from '../engine'
import { renderCard } from '../api/card'
import { shareCard } from '../api/whatsapp'
import { fallbackCard, type CardCopy, type RenderRequest } from '../shared/card'
import { c, serif } from '../theme'

const META: Record<RatingKey, { label: string; sub: string }> = {
  mastery: { label: 'Mastery', sub: 'How much they truly know' },
  retention: { label: 'Retention', sub: 'How well it sticks' },
  speed: { label: 'Speed', sub: 'Working pace' },
  carefulness: { label: 'Carefulness', sub: 'Marks kept, not slipped' },
  consistency: { label: 'Consistency', sub: 'Showing up & finishing' },
}
const ORDER: RatingKey[] = ['mastery', 'retention', 'speed', 'carefulness', 'consistency']

function scoreColor(score: number | null): string {
  if (score == null) return c.ink4
  if (score >= 75) return c.blue
  if (score >= 55) return c.amberDeep
  return c.red
}

/** Pentagon radar of the 5 ratings. Null (below data floor) → a small hollow node. */
function Radar({ ratings }: { ratings: Record<RatingKey, Rating> }) {
  const cx = 128
  const cy = 122
  const R = 92
  const pt = (frac: number, i: number) => {
    const ang = (-90 + i * 72) * (Math.PI / 180)
    return [cx + R * frac * Math.cos(ang), cy + R * frac * Math.sin(ang)]
  }
  const grid = [0.25, 0.5, 0.75, 1].map(
    (g) => ORDER.map((_, i) => pt(g, i).join(',')).join(' '),
  )
  const dataPts = ORDER.map((k, i) => {
    const s = ratings[k].score
    return pt(s == null ? 0.14 : Math.max(0.08, s / 100), i)
  })
  const dataPoly = dataPts.map((p) => p.join(',')).join(' ')

  return (
    <svg viewBox="0 0 256 250" width="100%" height="230" style={{ display: 'block' }}>
      {grid.map((g, i) => (
        <polygon key={i} points={g} fill="none" stroke={c.line3} strokeWidth={1} />
      ))}
      {ORDER.map((_, i) => {
        const [x, y] = pt(1, i)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={c.line3} strokeWidth={1} />
      })}
      <polygon points={dataPoly} fill="rgba(35,84,199,.16)" stroke={c.blue} strokeWidth={2} />
      {ORDER.map((k, i) => {
        const [x, y] = dataPts[i]
        const nul = ratings[k].score == null
        return (
          <circle
            key={k}
            cx={x}
            cy={y}
            r={4}
            fill={nul ? c.surface : c.blue}
            stroke={nul ? c.ink4 : c.blue}
            strokeWidth={2}
          />
        )
      })}
      {ORDER.map((k, i) => {
        const [x, y] = pt(1.16, i)
        return (
          <text
            key={k}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fontWeight={800}
            fill={c.ink2}
            fontFamily="Hanken Grotesk, sans-serif"
          >
            {META[k].label}
          </text>
        )
      })}
    </svg>
  )
}

// Learning Tracker — the 5-axis profile, insight headline, and chapter ledger.
// Every value here is computed by the deterministic engine (no hardcoded metrics).
export default function Tracker() {
  const nav = useNavigate()
  const { child, parentPhone, report } = useApp()
  const { ratings, chapters, headline, readinessPct, velocityBand, velocityPtsPerWeek } = report

  // Build the render request from the engine's chosen insight, then fetch warm
  // prose. The engine's own copy shows instantly and is replaced when (if) the
  // LLM version arrives — so the card always renders.
  const renderReq: RenderRequest | null = headline
    ? {
        childName: child.name,
        subject: 'Maths',
        chapter: chapters[0]?.chapter ?? 'Maths',
        polarity: headline.polarity,
        finding: headline.headline,
        detail: headline.detail,
        actionTonight: headline.actionTonight,
      }
    : null
  const [card, setCard] = useState<CardCopy | null>(() => (renderReq ? fallbackCard(renderReq) : null))
  useEffect(() => {
    if (!renderReq) return
    let alive = true
    renderCard(renderReq).then((r) => {
      if (alive) setCard(r.card)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headline?.metric])

  return (
    <AppShell active="progress">
     <div style={{ maxWidth: 720, margin: '0 auto', color: c.ink }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.ink3 }}>
            Learning profile
          </div>
          <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 25, margin: '2px 0 0' }}>{child.name}</h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, color: c.blue, lineHeight: 1 }}>
            {readinessPct}
            <span style={{ fontSize: 15 }}>%</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: c.ink3 }}>READINESS</div>
        </div>
      </div>

      {velocityBand && (
        <div
          style={{
            display: 'inline-flex',
            alignSelf: 'flex-start',
            background: velocityBand === 'slipping' ? c.redWash : c.blueWash,
            color: velocityBand === 'slipping' ? c.red : c.blue,
            fontSize: 12,
            fontWeight: 800,
            padding: '5px 11px',
            borderRadius: 12,
            marginBottom: 4,
          }}
        >
          {velocityBand === 'rising' ? '↑' : velocityBand === 'slipping' ? '↓' : '→'} {velocityBand}
          {velocityPtsPerWeek != null ? ` · ${velocityPtsPerWeek > 0 ? '+' : ''}${velocityPtsPerWeek} pts/wk` : ''}
        </div>
      )}

      <div style={{ background: c.white, border: `1px solid ${c.line2}`, borderRadius: 20, padding: '6px 6px 10px', marginBottom: 14 }}>
        <Radar ratings={ratings} />
      </div>

      {/* Insight card: rules engine CHOSE it and owns the numbers; the LLM only
          phrases it (guardrailed), falling back to the engine's own copy. */}
      {card && (
        <div style={{ background: 'linear-gradient(135deg,#1E1B16,#2A251C)', borderRadius: 18, padding: '16px 18px', color: c.cream, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.amber, marginBottom: 6 }}>
            This week&apos;s one thing
          </div>
          <p style={{ fontFamily: serif, fontSize: 18, lineHeight: 1.3, margin: '0 0 8px', fontWeight: 500 }}>{card.headline}</p>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: c.creamMute, fontWeight: 500, lineHeight: 1.4 }}>{card.body}</p>
          <div style={{ background: 'rgba(224,160,32,.14)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: c.amber }}>TONIGHT · </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: c.cream }}>{card.actionTonight}</span>
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: c.creamMute, fontWeight: 500, lineHeight: 1.4 }}>
            <span style={{ color: c.blueInk, fontWeight: 700 }}>Our side · </span>
            {card.ourSide}
          </p>
          <button
            onClick={() =>
              shareCard(
                card,
                { childName: child.name, subject: 'Maths', chapter: chapters[0]?.chapter, readinessPct },
                parentPhone,
              )
            }
            style={{ width: '100%', background: '#25D366', color: '#0A2E1A', border: 'none', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 800, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <WhatsAppGlyph /> Send this on WhatsApp
          </button>
        </div>
      )}

      {/* The five ratings */}
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.ink3, marginBottom: 9 }}>
        The five signals
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
        {ORDER.map((k) => {
          const r = ratings[k]
          const col = scoreColor(r.score)
          return (
            <div key={k} style={{ background: c.white, border: `1px solid ${c.line2}`, borderRadius: 14, padding: '13px 15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>{META[k].label}</span>
                  <span style={{ fontSize: 12, color: c.ink3, fontWeight: 500, marginLeft: 8 }}>{META[k].sub}</span>
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: col }}>{r.band}</span>
              </div>
              <div style={{ height: 7, background: '#EDE6DB', borderRadius: 5, overflow: 'hidden', marginBottom: 7 }}>
                {r.score != null ? (
                  <div style={{ width: `${r.score}%`, height: '100%', background: col, borderRadius: 5 }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: `repeating-linear-gradient(90deg, ${c.line3} 0 6px, transparent 6px 12px)` }} />
                )}
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: c.ink2, fontWeight: 500 }}>
                {r.hasData ? r.evidence : `${r.evidence} (needs more tests)`}
              </p>
            </div>
          )
        })}
      </div>

      {/* Chapter ledger — weakest first */}
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: c.ink3, marginBottom: 9 }}>
        Chapter ledger
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 'auto' }}>
        {chapters.map((ch) => (
          <div key={ch.chapter} style={{ background: c.white, border: `1px solid ${c.line2}`, borderRadius: 12, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{ch.chapter}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                {ch.roteFlag === 'ROTE' && <Flag text="memorised" bg={c.redWash} fg={c.red} />}
                {ch.roteFlag === 'INTUITIVE' && <Flag text="fumbles definitions" bg={c.amberWash} fg={c.amberDark} />}
                {ch.retentionBand === 'fast_fading' && <Flag text="fading" bg={c.amberWash} fg={c.amberDark} />}
                {ch.retentionBand === 'strong' && <Flag text="sticks" bg={c.blueWash} fg={c.blue} />}
              </div>
            </div>
            <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: scoreColor(Math.round(ch.readiness * 100)) }}>
              {Math.round(ch.readiness * 100)}%
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => nav('/term-audit')}
        style={{ width: '100%', background: c.ink, color: c.surface, border: 'none', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: 800, fontFamily: 'inherit', marginTop: 14 }}
      >
        See the September Term Audit →
      </button>
     </div>
    </AppShell>
  )
}

function Flag({ text, bg, fg }: { text: string; bg: string; fg: string }) {
  return (
    <span style={{ background: bg, color: fg, fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 8 }}>{text}</span>
  )
}

export function WhatsAppGlyph({ size = 17 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="#0A2E1A" aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.2 1.26-1.97 1.42-.53.11-1.22.2-3.56-.77-2.99-1.24-4.91-4.27-5.06-4.47-.15-.2-1.22-1.62-1.22-3.09s.77-2.19 1.04-2.49c.27-.3.59-.37.79-.37.2 0 .39.002.56.01.18.008.42-.068.66.5.24.58.82 2.01.89 2.16.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.31.4-.45.53-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.36 1.46.3.15.47.12.64-.07.17-.2.73-.85.93-1.14.2-.3.4-.25.66-.15.27.1 1.7.8 1.99.95.3.15.5.22.57.35.07.13.07.73-.17 1.41z" />
    </svg>
  )
}
