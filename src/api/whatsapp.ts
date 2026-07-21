// Client-side WhatsApp: open the native share sheet (works on device, no
// credentials) and, in parallel, hit the backend delivery channel (mock preview
// or real Business-API send).

import { formatCardMessage, waShareLink, type CardContext } from '../shared/whatsapp'
import type { CardCopy } from '../shared/card'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export interface DeliverResult {
  status: 'sent' | 'mock' | 'error'
  message: string
  waLink: string
  providerId?: string
  error?: string
}

export async function deliverCard(
  card: CardCopy,
  ctx: CardContext & { phone?: string },
): Promise<DeliverResult> {
  const res = await fetch(`${API_BASE}/api/send-card`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ card, ...ctx }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`send failed: ${res.status}`)
  return res.json()
}

/** Open WhatsApp with the card pre-composed. MUST be called from a click. */
export function openWhatsAppShare(card: CardCopy, ctx: CardContext, phone?: string): void {
  const message = formatCardMessage(card, ctx)
  window.open(waShareLink(message, phone), '_blank', 'noopener')
}

/**
 * Share flow: open the native share sheet synchronously (survives popup
 * blockers), then record/send through the backend. Never throws.
 */
export async function shareCard(
  card: CardCopy,
  ctx: CardContext,
  phone?: string,
): Promise<DeliverResult | null> {
  openWhatsAppShare(card, ctx, phone)
  try {
    return await deliverCard(card, { ...ctx, phone })
  } catch (err) {
    console.warn('[whatsapp] backend delivery unavailable:', err)
    return null
  }
}
