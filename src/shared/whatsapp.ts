// Shared WhatsApp formatting — used by the client (share link) and the server
// (Business API send) so the message reads identically either way.

import type { CardCopy } from './card'

export interface CardContext {
  childName: string
  subject?: string
  chapter?: string
  readinessPct?: number
  /** deep link back into the app / audit funnel (referral hook). */
  ctaUrl?: string
}

/** WhatsApp uses *bold*, _italic_, ~strike~. Keep it plain and short. */
export function formatCardMessage(card: CardCopy, ctx: CardContext): string {
  const lines: string[] = []
  lines.push(`*ParentProof — ${ctx.childName}'s learning audit*`)
  if (typeof ctx.readinessPct === 'number') {
    lines.push(`Readiness: *${ctx.readinessPct}%*${ctx.chapter ? ` · ${ctx.chapter}` : ''}`)
  }
  lines.push('')
  lines.push(`📊 *${card.headline}*`)
  lines.push(card.body)
  lines.push('')
  lines.push(`✅ *Tonight (10 min):* ${card.actionTonight}`)
  lines.push('')
  lines.push('_Independent audit — not the school’s report card._')
  lines.push(
    `Get your child’s free 7-day audit 👉 ${ctx.ctaUrl ?? 'https://parentproof.app'}`,
  )
  return lines.join('\n')
}

/** Reduce a phone number to WhatsApp's digits-only form (no +, spaces, dashes). */
export function normalizePhone(phone: string | undefined | null): string {
  return (phone ?? '').replace(/[^\d]/g, '')
}

/**
 * A wa.me deep link. With a phone it opens a chat with that number; without one
 * it opens WhatsApp's contact picker — the native "share to a parent group"
 * behaviour the plan relies on. Works on any device, no API credentials.
 */
export function waShareLink(message: string, phone?: string): string {
  const digits = normalizePhone(phone)
  const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(message)}`
}

/**
 * "Log in with WhatsApp" deep link. Opens the parent's own WhatsApp composing a
 * message to our Business number. Because the phone's WhatsApp is already
 * verified, *sending* it identifies the parent by their verified wa_id — so no
 * OTP is needed on the phone. `code` correlates the inbound message back to this
 * guest session; our inbound webhook resolves it and claims the account.
 * With no business number configured, falls back to the composer.
 */
export function waAccountLink(businessNumber: string, childName: string, code: string): string {
  const msg = `Hi ParentProof 👋 Save my progress — send ${childName}'s reports here. [${code}]`
  return waShareLink(msg, businessNumber)
}
