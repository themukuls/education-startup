// Layer 2 — the skill ledger (spec §3).
// Recency- and prior-weighted readiness per cell, chapter rollups, rote gap,
// and memory strength from decay re-tests.

import type { Cell, ChapterLedger, CogLevel, EnrichedAnswer } from './types'
import { cellKey } from './enrich'
import {
  READINESS_ALPHA,
  READINESS_PRIOR,
  blueprintWeight,
  recencyWeight,
  WEEK_MS,
  FLOORS,
} from './seeds'

/** readiness = (Σ wᵢ·correctᵢ + α·prior) / (Σ wᵢ + α); LUCKY excluded. */
export function computeCells(answers: EnrichedAnswer[], asOf: number): Map<string, Cell> {
  const agg = new Map<string, { wSum: number; wCorrect: number; attempts: number; chapter: string; cog: CogLevel }>()

  for (const a of answers) {
    if (a.lucky) continue // anti-noise / anti-cheat
    const k = cellKey(a.chapter, a.cogLevel)
    const weeksAgo = (asOf - a.timestamp) / WEEK_MS
    const w = recencyWeight(weeksAgo)
    const cur = agg.get(k) ?? { wSum: 0, wCorrect: 0, attempts: 0, chapter: a.chapter, cog: a.cogLevel }
    cur.wSum += w
    cur.wCorrect += w * (a.correct ? 1 : 0)
    cur.attempts += 1
    agg.set(k, cur)
  }

  const cells = new Map<string, Cell>()
  for (const [k, v] of agg) {
    const readiness = (v.wCorrect + READINESS_ALPHA * READINESS_PRIOR) / (v.wSum + READINESS_ALPHA)
    cells.set(k, { chapter: v.chapter, cogLevel: v.cog, readiness, attempts: v.attempts })
  }
  return cells
}

/** Provisional readiness map (cellKey → readiness) for error classification. */
export function cellReadinessMap(cells: Map<string, Cell>): Map<string, number> {
  const m = new Map<string, number>()
  for (const [k, c] of cells) m.set(k, c.readiness)
  return m
}

function meanReadiness(cells: Cell[]): number {
  if (!cells.length) return 0
  const totalAttempts = cells.reduce((s, c) => s + c.attempts, 0)
  if (!totalAttempts) return cells.reduce((s, c) => s + c.readiness, 0) / cells.length
  // attempt-weighted so a well-sampled cell counts more
  return cells.reduce((s, c) => s + c.readiness * c.attempts, 0) / totalAttempts
}

/** Roll cells up to chapters, compute rote gap + retention. */
export function computeChapterLedgers(
  cells: Map<string, Cell>,
  answers: EnrichedAnswer[],
  asOf: number,
): ChapterLedger[] {
  const byChapter = new Map<string, Cell[]>()
  for (const c of cells.values()) {
    const arr = byChapter.get(c.chapter) ?? []
    arr.push(c)
    byChapter.set(c.chapter, arr)
  }

  const ledgers: ChapterLedger[] = []
  for (const [chapter, chCells] of byChapter) {
    const readiness = meanReadiness(chCells)
    const attempts = chCells.reduce((s, c) => s + c.attempts, 0)

    // Rote gap: readiness_R − readiness_UA
    const rCell = chCells.find((c) => c.cogLevel === 'R')
    const uaCells = chCells.filter((c) => c.cogLevel === 'U' || c.cogLevel === 'A')
    const rAttempts = rCell?.attempts ?? 0
    const uaAttempts = uaCells.reduce((s, c) => s + c.attempts, 0)

    let roteGap: number | null = null
    let roteFlag: ChapterLedger['roteFlag'] = null
    if (rCell && rAttempts >= FLOORS.minRForRote && uaAttempts >= FLOORS.minUAForRote) {
      const readinessUA = meanReadiness(uaCells)
      roteGap = rCell.readiness - readinessUA
      if (roteGap >= 0.25) roteFlag = 'ROTE'
      else if (roteGap <= -0.15) roteFlag = 'INTUITIVE'
    }

    // Memory strength: readiness on decay-check answers vs earlier peak.
    const { retentionRatio, retentionBand } = computeRetention(chapter, answers, asOf)

    ledgers.push({ chapter, readiness, attempts, roteGap, roteFlag, retentionRatio, retentionBand })
  }
  ledgers.sort((a, b) => a.readiness - b.readiness) // weakest first
  return ledgers
}

function computeRetention(
  chapter: string,
  answers: EnrichedAnswer[],
  asOf: number,
): { retentionRatio: number | null; retentionBand: ChapterLedger['retentionBand'] } {
  const chAnswers = answers.filter((a) => a.chapter === chapter && !a.lucky)
  const decay = chAnswers.filter((a) => {
    // treat answers to this chapter in a decay_check-style recent window as the check
    return a.timestamp >= asOf - 3 * WEEK_MS
  })
  const earlier = chAnswers.filter((a) => a.timestamp < asOf - 3 * WEEK_MS)
  if (decay.length < 2 || earlier.length < 3) return { retentionRatio: null, retentionBand: null }

  const decayAcc = decay.filter((a) => a.correct).length / decay.length
  // peak = best 3-week-window accuracy in the earlier history
  const peakAcc = Math.max(
    earlier.filter((a) => a.correct).length / earlier.length,
    decayAcc, // guard against >1 ratios
  )
  if (peakAcc <= 0) return { retentionRatio: null, retentionBand: null }
  const ratio = decayAcc / peakAcc
  const band = ratio >= 0.85 ? 'strong' : ratio >= 0.65 ? 'normal' : 'fast_fading'
  return { retentionRatio: ratio, retentionBand: band }
}

/** Blueprint-weighted overall readiness across chapters, as a 0-100 percentage. */
export function blueprintReadinessPct(ledgers: ChapterLedger[]): number {
  if (!ledgers.length) return 0
  let wSum = 0
  let acc = 0
  for (const l of ledgers) {
    const w = blueprintWeight(l.chapter)
    wSum += w
    acc += w * l.readiness
  }
  return wSum ? Math.round((acc / wSum) * 100) : 0
}
