// Client → backend bridge for card prose. Always returns a card: the engine's
// own safe copy is the fallback, so the insight card renders even offline.

import { fallbackCard, type CardCopy, type RenderRequest } from '../shared/card'
import { llmHeaders } from './llm'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export async function renderCard(req: RenderRequest): Promise<{ card: CardCopy; source: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/render-card`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...llmHeaders() },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(45_000),
    })
    if (!res.ok) throw new Error(`render failed: ${res.status}`)
    const data = await res.json()
    if (!data.card?.headline) throw new Error('empty card')
    return { card: data.card as CardCopy, source: data.source ?? 'llm' }
  } catch (err) {
    console.warn('[card] render unavailable, using engine copy:', err)
    return { card: fallbackCard(req), source: 'fallback' }
  }
}
