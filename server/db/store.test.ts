import { describe, it, expect } from 'vitest'
import { SqliteStore } from './store'
import type { AnswerEvent, SessionEvent } from '../../src/engine/types'

const mk = () => new SqliteStore(':memory:')

describe('SqliteStore', () => {
  it('starts empty and roundtrips a child', () => {
    const s = mk()
    expect(s.isEmpty()).toBe(true)
    s.upsertChild({ id: 'c1', parentId: 'p1', name: 'Mukul', board: 'CBSE', klass: 10, subjects: ['Maths'], monthlySpend: 5000 })
    expect(s.isEmpty()).toBe(false)
    const c = s.getChild('c1')
    expect(c).toMatchObject({ id: 'c1', name: 'Mukul', klass: 10 })
    expect(c?.subjects).toEqual(['Maths'])
    s.close()
  })

  it('persists sessions + answers and returns engine input', () => {
    const s = mk()
    s.upsertChild({ id: 'c1', parentId: 'p1', name: 'M', board: 'CBSE', klass: 10, subjects: [], monthlySpend: 0 })
    const session: SessionEvent = { sessionId: 's1', childId: 'c1', type: 'weekly', assignedAt: 1000, completed: true, abandonedAtQ: null }
    s.addSession(session)
    const answers: AnswerEvent[] = [
      { childId: 'c1', itemId: 'i1', chapter: 'Quadratics', cogLevel: 'A', format: 'NUM', itemDifficulty: 0.5, correct: true, responseTimeSec: 90, answerChanged: false, skipped: false, sessionId: 's1', timestamp: 1000, position: 1 },
    ]
    s.addAnswers(answers)
    const input = s.getEngineInput('c1', 2000)
    expect(input.asOf).toBe(2000)
    expect(input.sessions).toHaveLength(1)
    expect(input.answers).toHaveLength(1)
    expect(input.answers[0]).toMatchObject({ chapter: 'Quadratics', correct: true, cogLevel: 'A', format: 'NUM' })
    s.close()
  })

  it('isolates events by child', () => {
    const s = mk()
    s.upsertChild({ id: 'a', parentId: 'p', name: 'A', board: 'CBSE', klass: 10, subjects: [], monthlySpend: 0 })
    s.addAnswers([
      { childId: 'a', itemId: 'i', chapter: 'X', cogLevel: 'R', format: 'MCQ', itemDifficulty: 0.5, correct: true, responseTimeSec: 20, answerChanged: false, skipped: false, sessionId: 's', timestamp: 1, position: 1 },
    ])
    expect(s.getEngineInput('a', 5).answers).toHaveLength(1)
    expect(s.getEngineInput('b', 5).answers).toHaveLength(0)
    s.close()
  })
})
