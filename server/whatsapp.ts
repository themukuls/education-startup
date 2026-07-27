// WhatsApp delivery via the Meta Cloud API. Sends the rendered card to a parent
// when WHATSAPP_TOKEN + WHATSAPP_PHONE_ID are configured; otherwise returns a
// mock preview (the composed message + a wa.me share link) so the flow is fully
// exercisable without credentials.

import { formatCardMessage, normalizePhone, waShareLink, type CardContext } from '../src/shared/whatsapp.ts'
import type { CardCopy } from '../src/shared/card.ts'

export function hasWhatsApp(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID)
}

export type SendStatus = 'sent' | 'mock' | 'error'

export interface SendResult {
  status: SendStatus
  message: string
  waLink: string
  providerId?: string
  error?: string
}

interface SendInput {
  card: CardCopy
  ctx: CardContext
  phone?: string
}

/**
 * Build the Cloud API request body. A business-INITIATED message (our weekly
 * card, sent outside a live chat window) must use a pre-approved template, so
 * we prefer WHATSAPP_TEMPLATE when set; a plain text message only delivers
 * inside an open 24h customer window.
 */
function buildBody(to: string, message: string, card: CardCopy) {
  const template = process.env.WHATSAPP_TEMPLATE
  if (template) {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: template,
        language: { code: process.env.WHATSAPP_LANG ?? 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: card.headline },
              { type: 'text', text: card.body },
              { type: 'text', text: card.actionTonight },
            ],
          },
        ],
      },
    }
  }
  return { messaging_product: 'whatsapp', to, type: 'text', text: { body: message, preview_url: true } }
}

/**
 * Send a login OTP via WhatsApp. Uses an approved AUTHENTICATION template when
 * WHATSAPP_OTP_TEMPLATE is set (required for business-initiated OTP), else a
 * plain text message (only delivers inside a 24h window). Mock-safe: returns
 * 'mock' without creds so cross-device login stays testable via devCode.
 */
export async function sendOtp(phone: string, code: string): Promise<{ status: SendStatus; error?: string }> {
  if (!hasWhatsApp()) return { status: 'mock' }
  const to = normalizePhone(phone)
  if (!to) return { status: 'error', error: 'no recipient phone number' }
  const template = process.env.WHATSAPP_OTP_TEMPLATE
  const body = template
    ? {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: template,
          language: { code: process.env.WHATSAPP_LANG ?? 'en' },
          components: [{ type: 'body', parameters: [{ type: 'text', text: code }] }],
        },
      }
    : { messaging_product: 'whatsapp', to, type: 'text', text: { body: `Your ParentProof code is ${code}. It expires in 10 minutes.` } }
  try {
    const version = process.env.WHATSAPP_API_VERSION ?? 'v21.0'
    const res = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      return { status: 'error', error: data.error?.message ?? `HTTP ${res.status}` }
    }
    return { status: 'sent' }
  } catch (err) {
    return { status: 'error', error: err instanceof Error ? err.message : 'send failed' }
  }
}

export async function sendCard({ card, ctx, phone }: SendInput): Promise<SendResult> {
  const message = formatCardMessage(card, ctx)
  const waLink = waShareLink(message, phone)

  if (!hasWhatsApp()) return { status: 'mock', message, waLink }

  const to = normalizePhone(phone)
  if (!to) return { status: 'error', message, waLink, error: 'no recipient phone number' }

  try {
    const version = process.env.WHATSAPP_API_VERSION ?? 'v21.0'
    const res = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(buildBody(to, message, card)),
    })
    const data = (await res.json().catch(() => ({}))) as {
      messages?: { id: string }[]
      error?: { message?: string }
    }
    if (!res.ok) {
      return { status: 'error', message, waLink, error: data.error?.message ?? `HTTP ${res.status}` }
    }
    return { status: 'sent', message, waLink, providerId: data.messages?.[0]?.id }
  } catch (err) {
    return { status: 'error', message, waLink, error: err instanceof Error ? err.message : 'send failed' }
  }
}
