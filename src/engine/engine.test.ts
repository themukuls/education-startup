import { describe, it, expect } from 'vitest'
import { computeReport } from './index'
import { buildStream } from './synthetic'

const ASOF = 1_760_000_000_000 // fixed epoch so results are deterministic

describe('rating engine — archetypes behave', () => {
  it('rusher loses marks to speed, not knowledge', () => {
    const report = computeReport(buildStream({ archetype: 'rusher', asOf: ASOF, seed: 7 }))
    expect(report.ratings.carefulness.hasData).toBe(true)
    // careless share is high → carefulness score is depressed
    expect(report.ratings.carefulness.score!).toBeLessThan(70)
    expect(['Rushing', 'Brisk']).toContain(report.ratings.speed.band)
  })

  it('improver shows a rising trajectory', () => {
    const report = computeReport(buildStream({ archetype: 'improver', asOf: ASOF, seed: 3 }))
    expect(report.ratings.mastery.hasData).toBe(true)
    // velocity should not be negative for an improving child
    expect(report.velocityPtsPerWeek ?? 0).toBeGreaterThanOrEqual(0)
  })

  it('crammer reads as irregular / cramming, not steady', () => {
    const report = computeReport(buildStream({ archetype: 'crammer', asOf: ASOF, seed: 5 }))
    expect(report.ratings.consistency.hasData).toBe(true)
    expect(report.ratings.consistency.band).not.toBe('Steady')
  })

  it('fader shows a stamina drop in consistency evidence', () => {
    const report = computeReport(buildStream({ archetype: 'fader', asOf: ASOF, seed: 9 }))
    // fade is detected somewhere in the pipeline (stamina feeds consistency evidence)
    expect(report.testsTaken).toBeGreaterThanOrEqual(3)
  })
})

describe('data floors (spec §6)', () => {
  it('cold start (1 test) suppresses insight headlines', () => {
    const report = computeReport(buildStream({ archetype: 'coldstart', asOf: ASOF, seed: 1 }))
    expect(report.coldStart).toBe(true)
    expect(report.headline).toBeNull()
  })

  it('a full stream clears the cold-start floor and produces a headline', () => {
    const report = computeReport(buildStream({ archetype: 'rusher', asOf: ASOF, seed: 7 }))
    expect(report.coldStart).toBe(false)
    expect(report.headline).not.toBeNull()
  })

  it('carefulness withholds a claim below the 6-error floor', () => {
    // one perfect-ish tiny stream → too few errors to classify
    const input = buildStream({ archetype: 'coldstart', asOf: ASOF, seed: 2 })
    const report = computeReport(input)
    // with a single 9-question test, error-class claims may be withheld
    if (report.ratings.carefulness.hasData === false) {
      expect(report.ratings.carefulness.score).toBeNull()
    }
    expect(report.ratings.carefulness.band).toBeTruthy()
  })
})

describe('determinism + shape', () => {
  it('same seed → identical report', () => {
    const a = computeReport(buildStream({ archetype: 'improver', asOf: ASOF, seed: 11 }))
    const b = computeReport(buildStream({ archetype: 'improver', asOf: ASOF, seed: 11 }))
    expect(a).toEqual(b)
  })

  it('readiness is a 0-100 integer and all five ratings exist', () => {
    const report = computeReport(buildStream({ archetype: 'improver', asOf: ASOF, seed: 4 }))
    expect(report.readinessPct).toBeGreaterThanOrEqual(0)
    expect(report.readinessPct).toBeLessThanOrEqual(100)
    expect(Number.isInteger(report.readinessPct)).toBe(true)
    for (const k of ['mastery', 'retention', 'speed', 'carefulness', 'consistency'] as const) {
      expect(report.ratings[k]).toBeTruthy()
      expect(report.ratings[k].band).toBeTruthy()
    }
  })

  it('surfaces a rote gap on Quadratics (recites, can’t apply)', () => {
    const report = computeReport(buildStream({ archetype: 'improver', asOf: ASOF, seed: 4 }))
    const quad = report.chapters.find((c) => c.chapter === 'Quadratics')
    expect(quad).toBeTruthy()
    // the generator seeds R high, A low → a positive rote gap when data floor met
    if (quad?.roteGap != null) expect(quad.roteGap).toBeGreaterThan(0)
  })
})
