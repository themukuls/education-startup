import { describe, it, expect } from 'vitest'
import { SqliteStore } from './store'
import type { AnswerEvent, SessionEvent } from '../../src/engine/types'

const mk = async () => {
  const s = new SqliteStore(':memory:')
  await s.init()
  return s
}

describe('SqliteStore', () => {
  it('starts empty and roundtrips a child', async () => {
    const s = await mk()
    expect(await s.isEmpty()).toBe(true)
    await s.upsertChild({ id: 'c1', parentId: 'p1', name: 'Mukul', board: 'CBSE', klass: 10, subjects: ['Maths'], monthlySpend: 5000 })
    expect(await s.isEmpty()).toBe(false)
    const c = await s.getChild('c1')
    expect(c).toMatchObject({ id: 'c1', name: 'Mukul', klass: 10 })
    expect(c?.subjects).toEqual(['Maths'])
    await s.close()
  })

  it('persists sessions + answers and returns engine input', async () => {
    const s = await mk()
    await s.upsertChild({ id: 'c1', parentId: 'p1', name: 'M', board: 'CBSE', klass: 10, subjects: [], monthlySpend: 0 })
    const session: SessionEvent = { sessionId: 's1', childId: 'c1', type: 'weekly', assignedAt: 1000, completed: true, abandonedAtQ: null }
    await s.addSession(session)
    const answers: AnswerEvent[] = [
      { childId: 'c1', itemId: 'i1', chapter: 'Quadratics', cogLevel: 'A', format: 'NUM', itemDifficulty: 0.5, correct: true, responseTimeSec: 90, answerChanged: false, skipped: false, sessionId: 's1', timestamp: 1000, position: 1 },
    ]
    await s.addAnswers(answers)
    const input = await s.getEngineInput('c1', 2000)
    expect(input.asOf).toBe(2000)
    expect(input.sessions).toHaveLength(1)
    expect(input.answers).toHaveLength(1)
    expect(input.answers[0]).toMatchObject({ chapter: 'Quadratics', correct: true, cogLevel: 'A', format: 'NUM' })
    await s.close()
  })

  it('isolates events by child', async () => {
    const s = await mk()
    await s.upsertChild({ id: 'a', parentId: 'p', name: 'A', board: 'CBSE', klass: 10, subjects: [], monthlySpend: 0 })
    await s.addAnswers([
      { childId: 'a', itemId: 'i', chapter: 'X', cogLevel: 'R', format: 'MCQ', itemDifficulty: 0.5, correct: true, responseTimeSec: 20, answerChanged: false, skipped: false, sessionId: 's', timestamp: 1, position: 1 },
    ])
    expect((await s.getEngineInput('a', 5)).answers).toHaveLength(1)
    expect((await s.getEngineInput('b', 5)).answers).toHaveLength(0)
    await s.close()
  })

  it('mints tokens + scopes children to their owning parent', async () => {
    const s = await mk()
    await s.createParent({ id: 'p1', name: '', phone: '', claimed: false })
    await s.createToken('tok-1', 'p1')
    expect(await s.parentIdForToken('tok-1')).toBe('p1')
    expect(await s.parentIdForToken('nope')).toBeNull()

    await s.upsertChild({ id: 'k1', parentId: 'p1', name: 'A', board: 'CBSE', klass: 10, subjects: [], monthlySpend: 0 })
    await s.upsertChild({ id: 'k2', parentId: 'p2', name: 'B', board: 'CBSE', klass: 10, subjects: [], monthlySpend: 0 })
    const mine = await s.getChildrenForParent('p1')
    expect(mine.map((c) => c.id)).toEqual(['k1'])
    // the other parent's child is reachable by id but carries their ownership
    expect((await s.getChild('k2'))?.parentId).toBe('p2')

    await s.deleteToken('tok-1')
    expect(await s.parentIdForToken('tok-1')).toBeNull()
    await s.close()
  })

  it('claims an anonymous parent (guest → claimed) and finds by phone', async () => {
    const s = await mk()
    await s.createParent({ id: 'p1', name: '', phone: '', claimed: false })
    expect((await s.getParent('p1'))?.claimed).toBe(false)
    await s.upsertParent({ id: 'p1', name: 'Priya', phone: '919876543210', channel: 'whatsapp', claimed: true })
    const p = await s.getParent('p1')
    expect(p).toMatchObject({ name: 'Priya', phone: '919876543210', claimed: true })
    expect((await s.getParentByPhone('919876543210'))?.id).toBe('p1')
    await s.close()
  })
})
