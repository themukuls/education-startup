import { describe, it, expect } from 'vitest'
import { formatCardMessage, waShareLink, normalizePhone } from './whatsapp'
import type { CardCopy } from './card'

const card: CardCopy = {
  headline: 'Quadratics: memorised, not understood.',
  body: 'Recites the formula but mixes up 6 of 9 application questions.',
  actionTonight: 'Ask him to explain it in his own words.',
  ourSide: 'The next test folds in a Quadratics check.',
  kidLine: 'Beat this one this week! 🔥',
}

describe('whatsapp formatting', () => {
  it('includes the finding, action, readiness and a CTA', () => {
    const msg = formatCardMessage(card, { childName: 'Mukul', chapter: 'Quadratics', readinessPct: 63, ctaUrl: 'https://x.io' })
    expect(msg).toContain('Mukul')
    expect(msg).toContain('63%')
    expect(msg).toContain(card.headline)
    expect(msg).toContain(card.actionTonight)
    expect(msg).toContain('https://x.io')
  })

  it('omits readiness line when not provided', () => {
    const msg = formatCardMessage(card, { childName: 'Mukul' })
    expect(msg).not.toMatch(/Readiness:/)
  })

  it('normalizes phone numbers to digits', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('919876543210')
    expect(normalizePhone(undefined)).toBe('')
  })

  it('builds a wa.me link with an encoded message', () => {
    const link = waShareLink('hi there & bye', '+91 98765 43210')
    expect(link).toBe('https://wa.me/919876543210?text=hi%20there%20%26%20bye')
  })

  it('opens the contact picker when no phone is given', () => {
    expect(waShareLink('yo')).toBe('https://wa.me/?text=yo')
  })
})
