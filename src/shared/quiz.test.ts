import { describe, it, expect } from 'vitest'
import { validateItem, validateItems, toQuestions, type GeneratedItem } from './quiz'

const good: GeneratedItem = {
  prompt: 'The roots of x^2 - 5x + 6 = 0 are',
  options: ['2 and 3', '-2 and -3', '1 and 6', '-1 and -6'],
  answer: 0,
  cogLevel: 'A',
  format: 'MCQ',
  difficulty: 0.4,
  misconception: 'sign errors when factorising',
}

describe('question guardrail', () => {
  it('accepts a well-formed item', () => {
    expect(validateItem(good)).toBeNull()
  })

  it('rejects wrong option counts', () => {
    expect(validateItem({ ...good, options: ['a', 'b', 'c'] })).toMatch(/4 options/)
  })

  it('rejects an out-of-range answer index', () => {
    expect(validateItem({ ...good, answer: 4 })).toMatch(/out of range/)
    expect(validateItem({ ...good, answer: -1 })).toMatch(/out of range/)
  })

  it('rejects duplicate options', () => {
    expect(validateItem({ ...good, options: ['2 and 3', '2 and 3', 'x', 'y'] })).toMatch(/duplicate/)
  })

  it('rejects empty options and short prompts', () => {
    expect(validateItem({ ...good, options: ['a', '', 'c', 'd'] })).toMatch(/empty/)
    expect(validateItem({ ...good, prompt: 'x' })).toMatch(/too short/)
  })

  it('rejects bad enums and difficulty', () => {
    expect(validateItem({ ...good, cogLevel: 'Z' })).toMatch(/cogLevel/)
    expect(validateItem({ ...good, format: 'ESSAY' })).toMatch(/format/)
    expect(validateItem({ ...good, difficulty: 2 })).toMatch(/difficulty/)
  })

  it('filters a mixed batch and reports drops', () => {
    const { valid, dropped } = validateItems([good, { ...good, answer: 9 }, 'nonsense'])
    expect(valid).toHaveLength(1)
    expect(dropped).toHaveLength(2)
  })

  it('maps validated items to app questions', () => {
    const qs = toQuestions([good], 'Maths', 'Quadratics')
    expect(qs[0]).toMatchObject({ id: 1, subject: 'Maths', topic: 'Quadratics', skill: 'A', answer: 0 })
    expect(qs[0].options).toHaveLength(4)
  })
})
