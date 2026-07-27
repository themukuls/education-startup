import { describe, it, expect } from 'vitest'
import { SqliteStore } from '../db/store'
import { cosine, ingest, retrieve, groundingBlock } from './index'
import { mockEmbed } from './embed'

const mk = async () => {
  const s = new SqliteStore(':memory:')
  await s.init()
  return s
}

const docs = [
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Quadratics', source: 'q', content: 'quadratic equation ax^2 + bx + c roots discriminant formula' },
  { board: 'CBSE', klass: 10, subject: 'Maths', chapter: 'Triangles', source: 't', content: 'similar triangles proportional sides basic proportionality theorem' },
]

describe('RAG retrieval (mock embeddings)', () => {
  it('cosine is 1 for identical, ~0 for disjoint vocab', () => {
    expect(cosine(mockEmbed('quadratic roots'), mockEmbed('quadratic roots'))).toBeCloseTo(1, 5)
    expect(cosine(mockEmbed('quadratic roots'), mockEmbed('triangle angles'))).toBeLessThan(0.5)
  })

  it('ranks the on-topic chunk first', async () => {
    const s = await mk()
    await ingest(s, docs, null)
    expect(await s.countChunks()).toBe(2)
    const hits = await retrieve(s, 'roots of a quadratic using the discriminant', { subject: 'Maths' }, 2, null)
    expect(hits[0].chunk.chapter).toBe('Quadratics')
    expect(hits[0].score).toBeGreaterThan(hits[1].score)
    await s.close()
  })

  it('respects the metadata filter', async () => {
    const s = await mk()
    await ingest(s, docs, null)
    const hits = await retrieve(s, 'anything', { chapter: 'Triangles' }, 5, null)
    expect(hits).toHaveLength(1)
    expect(hits[0].chunk.chapter).toBe('Triangles')
    await s.close()
  })

  it('groundingBlock is empty with no hits, includes content otherwise', () => {
    expect(groundingBlock([])).toBe('')
    const block = groundingBlock([{ chunk: { ...docs[0], id: 'x', embedding: [] }, score: 1 }])
    expect(block).toContain('quadratic equation')
  })
})
