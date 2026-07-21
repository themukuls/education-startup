// Synthesize the 5 parent-facing ratings (mastery, retention, speed,
// carefulness, consistency) from the engine layers. Each rating respects the
// data floors (spec §6) and uses mechanism language, never trait language (§0).

import type { ChapterLedger, EnrichedAnswer, Rating, RatingKey, SessionEvent } from './types'
import {
  computeVelocity,
  computeConsistency,
  computeStamina,
  medianSpeedRatio,
  avgSecondsPerQuestion,
} from './trackers'
import { FLOORS } from './seeds'

export interface RatingsContext {
  readinessPct: number
  ledgers: ChapterLedger[]
  answers: EnrichedAnswer[]
  sessions: SessionEvent[]
  asOf: number
  testsTaken: number
}

function bandFromScore(s: number, labels: [number, string][]): string {
  for (const [threshold, label] of labels) if (s >= threshold) return label
  return labels[labels.length - 1][1]
}

function masteryRating(ctx: RatingsContext): Rating {
  const score = ctx.readinessPct
  const hasData = ctx.answers.length >= 5
  const weakest = ctx.ledgers[0]
  const roteChapter = ctx.ledgers.find((l) => l.roteFlag === 'ROTE')
  let evidence = weakest ? `Weakest area: ${weakest.chapter}.` : 'Building a picture across chapters.'
  if (roteChapter) evidence = `Recites ${roteChapter.chapter} but can't yet apply it.`
  return {
    key: 'mastery',
    score: hasData ? score : null,
    band: bandFromScore(score, [
      [75, 'Strong grip'],
      [60, 'On track'],
      [45, 'Building'],
      [0, 'Needs support'],
    ]),
    evidence,
    hasData,
  }
}

function retentionRating(ctx: RatingsContext): Rating {
  const withRet = ctx.ledgers.filter((l) => l.retentionRatio != null)
  const hasData = withRet.length > 0
  const mean = hasData
    ? withRet.reduce((s, l) => s + (l.retentionRatio as number), 0) / withRet.length
    : 0
  const fastest = [...withRet].sort(
    (a, b) => (a.retentionRatio as number) - (b.retentionRatio as number),
  )[0]
  return {
    key: 'retention',
    score: hasData ? Math.round(Math.min(1, mean) * 100) : null,
    band: hasData
      ? mean >= 0.85
        ? 'Strong'
        : mean >= 0.65
          ? 'Normal'
          : 'Fast-fading'
      : 'Building',
    evidence: hasData
      ? fastest && (fastest.retentionRatio as number) < 0.85
        ? `${fastest.chapter} fades fastest between tests.`
        : 'Holds onto what was learned across weeks.'
      : 'Needs a few weeks of tests to measure memory.',
    hasData,
  }
}

function speedRating(ctx: RatingsContext): Rating {
  const hasData = ctx.answers.length >= FLOORS.minAttemptsPerFormat
  const rho = medianSpeedRatio(ctx.answers) ?? 1
  const avg = avgSecondsPerQuestion(ctx.answers)
  // reward an appropriate pace; penalise rushing hardest (it drives careless loss)
  let score: number
  let band: string
  if (rho < 0.6) {
    score = 50
    band = 'Rushing'
  } else if (rho < 0.85) {
    score = 78
    band = 'Brisk'
  } else if (rho <= 1.2) {
    score = 92
    band = 'On-pace'
  } else if (rho <= 1.6) {
    score = 74
    band = 'Deliberate'
  } else {
    score = 60
    band = 'Slow'
  }
  return {
    key: 'speed',
    score: hasData ? score : null,
    band,
    evidence: hasData ? `About ${avg}s per question.` : 'Not enough answers yet.',
    hasData,
  }
}

function carefulnessRating(ctx: RatingsContext): Rating {
  const errors = ctx.answers.filter((a) => !a.correct)
  const hasData = errors.length >= FLOORS.minErrorsForClassClaims
  const careless = errors.filter((a) => a.errorClass === 'CARELESS').length
  const share = errors.length ? careless / errors.length : 0
  const score = Math.round((1 - share) * 100)
  return {
    key: 'carefulness',
    score: hasData ? score : null,
    band: hasData
      ? share <= 0.2
        ? 'Careful'
        : share <= 0.45
          ? 'Mostly careful'
          : 'Rushing answers'
      : 'Building',
    evidence: hasData
      ? `${careless} of ${errors.length} slips were on questions already known.`
      : 'A few more tests will show the pattern.',
    hasData,
  }
}

function consistencyRating(ctx: RatingsContext): Rating {
  const recent = ctx.sessions.filter((s) => s.assignedAt >= ctx.asOf - 6 * 7 * 24 * 60 * 60 * 1000)
  const hasData = recent.length >= FLOORS.minWeeksForVelocity
  const cons = computeConsistency(ctx.sessions, ctx.asOf)
  const stamina = computeStamina(ctx.answers)
  const completed = recent.filter((s) => s.completed).length
  let evidence = hasData
    ? `Took ${completed} of ${recent.length} weekly tests.`
    : 'Just getting the weekly rhythm going.'
  if (hasData && stamina.fades) evidence = `Strong start, then fades late in the test (−${stamina.fadePts} pts).`
  return {
    key: 'consistency',
    score: hasData ? Math.round(cons.index * 100) : null,
    band: hasData
      ? cons.band === 'steady'
        ? 'Steady'
        : cons.band === 'irregular'
          ? 'Irregular'
          : 'Cramming'
      : 'Building',
    evidence,
    hasData,
  }
}

export function computeRatings(ctx: RatingsContext): Record<RatingKey, Rating> {
  const velocity = computeVelocity(ctx.answers, ctx.asOf)
  const trend = velocity.band === 'rising' ? 'up' : velocity.band === 'slipping' ? 'down' : 'flat'

  const mastery = masteryRating(ctx)
  mastery.trend = trend

  return {
    mastery,
    retention: retentionRating(ctx),
    speed: speedRating(ctx),
    carefulness: carefulnessRating(ctx),
    consistency: consistencyRating(ctx),
  }
}
