// Retrieval-augmented generation core. Ingest chunks (embed + store), and
// retrieve the top-k most relevant to a query within a metadata filter.
//
// Retrieval ranks with cosine similarity in JS over the metadata-filtered
// candidates. That's portable (SQLite + Postgres, no pgvector) and correct for
// the current corpus size; at scale, swap the ranking for a pgvector `<=>`
// query in PostgresStore.getChunks — nothing else changes.

import { randomUUID } from 'node:crypto'
import type { Store, RagChunk, ChunkFilter } from '../db/store.ts'
import type { LlmCreds } from '../llm/index.ts'
import { embed } from './embed.ts'

export interface RawDoc {
  board: string
  klass: number
  subject: string
  chapter: string
  source: string
  content: string
}

/** cosine of two equal-length vectors (both are L2-normalised for real models
 * too, but we normalise defensively). */
export function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const d = Math.sqrt(na) * Math.sqrt(nb)
  return d === 0 ? 0 : dot / d
}

/** Embed + store a batch of docs. */
export async function ingest(store: Store, docs: RawDoc[], creds: LlmCreds | null): Promise<number> {
  if (docs.length === 0) return 0
  const vectors = await embed(docs.map((d) => `${d.chapter} — ${d.content}`), creds)
  const chunks: RagChunk[] = docs.map((d, i) => ({ id: `rag_${randomUUID()}`, ...d, embedding: vectors[i] }))
  await store.upsertChunks(chunks)
  return chunks.length
}

export interface Retrieved {
  chunk: RagChunk
  score: number
}

/** Top-k chunks for a query within the metadata filter. */
export async function retrieve(
  store: Store,
  query: string,
  filter: ChunkFilter,
  k: number,
  creds: LlmCreds | null,
): Promise<Retrieved[]> {
  const candidates = await store.getChunks(filter)
  if (candidates.length === 0) return []
  const [qv] = await embed([query], creds)
  return candidates
    .map((chunk) => ({ chunk, score: cosine(qv, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}

/** Format retrieved chunks as grounding context for a generation prompt. */
export function groundingBlock(hits: Retrieved[]): string {
  if (hits.length === 0) return ''
  const body = hits.map((h, i) => `[${i + 1}] (${h.chunk.source}) ${h.chunk.content}`).join('\n')
  return `\n\nGround every question ONLY in this syllabus material — do not go beyond it:\n${body}`
}
