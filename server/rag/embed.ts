// Embeddings for RAG. With a provider key (env or BYOK) we call a real embedding
// model; without one we use a deterministic, dependency-free hashing embedder so
// the whole retrieval pipeline is testable offline. Same swap pattern as the LLM
// layer — the ingest and query embedders must always match (model + dimension).

import type { LlmCreds } from '../llm/index.ts'

const MOCK_DIM = 256

/** Deterministic bag-of-words hashing embedder. Shared tokens → higher cosine —
 * enough to demonstrate correct retrieval without any API. */
export function mockEmbed(text: string): number[] {
  const v = new Array(MOCK_DIM).fill(0)
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? []
  for (const tok of tokens) {
    let h = 2166136261
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    const idx = Math.abs(h) % MOCK_DIM
    const sign = (h & 1) === 0 ? 1 : -1
    v[idx] += sign
  }
  // L2-normalise so cosine == dot product
  const norm = Math.hypot(...v) || 1
  return v.map((x) => x / norm)
}

/** OpenAI-compatible / Gemini embeddings when a key is present, else mock. */
export async function embed(texts: string[], creds: LlmCreds | null): Promise<number[][]> {
  if (!creds) return texts.map(mockEmbed)
  try {
    if (creds.provider === 'gemini') return await geminiEmbed(texts, creds)
    return await openaiEmbed(texts, creds) // openai + groq(openai-compatible)
  } catch (err) {
    console.warn('[rag] embedding provider failed, using mock:', err)
    return texts.map(mockEmbed)
  }
}

const EMBED_MODEL = () => process.env.EMBEDDING_MODEL

async function openaiEmbed(texts: string[], creds: LlmCreds): Promise<number[][]> {
  const base = (creds.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')
  const res = await fetch(`${base}/embeddings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${creds.apiKey}` },
    body: JSON.stringify({ model: EMBED_MODEL() || 'text-embedding-3-small', input: texts }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`openai embeddings ${res.status}`)
  const data = (await res.json()) as { data: { embedding: number[] }[] }
  return data.data.map((d) => d.embedding)
}

async function geminiEmbed(texts: string[], creds: LlmCreds): Promise<number[][]> {
  const base = 'https://generativelanguage.googleapis.com/v1beta'
  const model = EMBED_MODEL() || 'text-embedding-004'
  const out: number[][] = []
  for (const text of texts) {
    const res = await fetch(`${base}/models/${model}:embedContent?key=${encodeURIComponent(creds.apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) throw new Error(`gemini embeddings ${res.status}`)
    const data = (await res.json()) as { embedding: { values: number[] } }
    out.push(data.embedding.values)
  }
  return out
}
