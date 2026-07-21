import { describe, it, expect } from 'vitest'
import { checkCard, allowedNumbers, fallbackCard, type CardCopy, type RenderRequest } from './card'

const req: RenderRequest = {
  childName: 'Mukul',
  subject: 'Maths',
  chapter: 'Quadratics',
  polarity: 'negative',
  finding: 'Quadratics: memorised, not understood.',
  detail: '6 of 9 answers dropped on questions that need applying it.',
  actionTonight: 'Ask him to explain Quadratics in his own words.',
}

const base: CardCopy = {
  headline: 'Quadratics is being memorised, not understood.',
  body: 'He recites the formula but mixes up 6 of 9 application questions.',
  actionTonight: 'Tonight, ask him to explain it in his own words in 10 minutes.',
  ourSide: 'The next test folds in a short Quadratics check.',
  kidLine: 'Beat this one this week for bonus streak points!',
}

describe('card language guardrail', () => {
  const allowed = allowedNumbers(req) // {6, 9}

  it('accepts clean, on-contract copy', () => {
    expect(checkCard(base, allowed)).toBeNull()
  })

  it('rejects banned trait words', () => {
    expect(checkCard({ ...base, body: 'He is not very smart at this.' }, allowed)).toMatch(/banned/)
    expect(checkCard({ ...base, headline: 'He is lazy about Quadratics.' }, allowed)).toMatch(/banned/)
    expect(checkCard({ ...base, body: 'He is careless here.' }, allowed)).toMatch(/banned/)
    expect(checkCard({ ...base, kidLine: 'You are weak at maths.' }, allowed)).toMatch(/banned/)
  })

  it('does not flag safe words that merely contain a banned substring', () => {
    // "weakest" contains "weak" but is a whole different word
    expect(checkCard({ ...base, body: 'His weakest area improved, 6 of 9 now correct.' }, allowed)).toBeNull()
  })

  it('rejects invented numbers not supplied by the engine', () => {
    expect(checkCard({ ...base, body: 'He got 3 of 12 wrong.' }, allowed)).toMatch(/invented number/)
  })

  it('allows time numbers (5/10/15) in the action', () => {
    expect(checkCard({ ...base, actionTonight: 'Spend 15 minutes on it tonight.' }, allowed)).toBeNull()
  })

  it('rejects more than two numbers on the parent card', () => {
    const noisy = { ...base, headline: '6 of 9', body: 'also 6 and 9 and 6' }
    expect(checkCard(noisy, allowed)).toMatch(/more than 2 numbers/)
  })

  it('fallback copy is always valid', () => {
    const fb = fallbackCard(req)
    expect(checkCard(fb, allowedNumbers(req))).toBeNull()
  })
})
