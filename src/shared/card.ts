// Shared card contract — the prose the LLM is allowed to produce, and the
// guardrail that decides whether its output is safe to show a parent.
//
// Design contract (tracker spec §0, §5.4): the engine owns every number and
// every claim; the model only rephrases. So the guardrail enforces two things —
// no banned (trait / shaming) language, and no number the engine didn't provide.

export interface RenderRequest {
  childName: string
  subject: string
  chapter: string
  polarity: 'positive' | 'negative'
  /** the engine's templated strings — the safe fallback and the source of truth. */
  finding: string
  detail: string
  actionTonight: string
}

export interface CardCopy {
  /** the finding, one plain sentence. */
  headline: string
  /** evidence + mechanism woven together, ≤2 numbers. */
  body: string
  /** one instruction a parent can do tonight in <10 min. */
  actionTonight: string
  /** the app's automatic response ("our side"). */
  ourSide: string
  /** kid-facing, gamified framing of the same finding (spec §5.4). */
  kidLine: string
}

/**
 * Banned output vocabulary (spec §0 + §5.4). Trait words, ability judgements,
 * and shaming adjectives are never allowed in parent-facing copy. Matched as
 * whole words, case-insensitively.
 */
export const BANNED_WORDS = [
  'intelligent',
  'intelligence',
  'smart',
  'iq',
  'talent',
  'talented',
  'gifted',
  'lazy',
  'careless',
  'weak',
  'behind',
  'failing',
  'stupid',
  'dumb',
  'slow learner',
  'weak student',
  'bad at',
]

/** Time numbers allowed in an action even if not in the engine's evidence. */
const TIME_WHITELIST = new Set(['5', '10', '15'])

export function extractNumbers(text: string): string[] {
  return (text.match(/\d+(?:\.\d+)?/g) ?? []).map(String)
}

function bannedHit(text: string): string | null {
  const lower = text.toLowerCase()
  for (const w of BANNED_WORDS) {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (re.test(lower)) return w
  }
  return null
}

/**
 * Validate rendered copy. `allowed` is the set of numbers the engine supplied;
 * any number in the copy outside that set (and the time whitelist) means the
 * model invented a statistic → reject.
 */
export function checkCard(copy: CardCopy, allowed: Set<string>): string | null {
  const fields = [copy.headline, copy.body, copy.actionTonight, copy.ourSide, copy.kidLine]
  for (const f of fields) {
    if (typeof f !== 'string' || f.trim().length === 0) return 'empty field'
    const banned = bannedHit(f)
    if (banned) return `banned word "${banned}"`
    for (const n of extractNumbers(f)) {
      if (!allowed.has(n) && !TIME_WHITELIST.has(n)) return `invented number "${n}"`
    }
  }
  // parent card keeps at most 2 numbers (spec §5.4)
  const parentNumbers = extractNumbers(`${copy.headline} ${copy.body}`)
  if (parentNumbers.length > 2) return 'more than 2 numbers on the card'
  return null
}

/** The always-safe fallback: the engine's own strings, lightly shaped. */
export function fallbackCard(req: RenderRequest): CardCopy {
  return {
    headline: req.finding,
    body: req.detail,
    actionTonight: req.actionTonight,
    ourSide:
      req.polarity === 'negative'
        ? `We'll fold a short ${req.chapter} check into ${req.childName}'s next test to see if it worked.`
        : `We'll keep watching ${req.chapter} so the win holds.`,
    kidLine:
      req.polarity === 'negative'
        ? `Beat this one this week for bonus streak points! 🔥`
        : `Nice — ${req.chapter} is locked in. Keep the streak going! ⭐`,
  }
}

/** Numbers the engine provided for this card (the only ones the model may use). */
export function allowedNumbers(req: RenderRequest): Set<string> {
  return new Set(extractNumbers(`${req.finding} ${req.detail} ${req.actionTonight}`))
}
