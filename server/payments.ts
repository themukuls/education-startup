// Razorpay payments — real when RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET are set,
// otherwise a deterministic mock so the whole pay → entitlement flow is testable
// without keys. Uses fetch + HMAC (no SDK).

import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto'

export type Plan = 'core' | 'annual'

/** Amount in paise + label per plan (₹999 / 6 months, ₹1,799 / year). */
export const PLANS: Record<Plan, { amountPaise: number; label: string }> = {
  core: { amountPaise: 99900, label: 'Core · 6 months' },
  annual: { amountPaise: 179900, label: 'Annual' },
}

export function isPlan(v: string): v is Plan {
  return v === 'core' || v === 'annual'
}

export function hasRazorpay(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
}

export interface Order {
  orderId: string
  amount: number
  currency: string
  keyId: string | null
  mock: boolean
}

/** Create an order (real Razorpay order, or a mock one). */
export async function createOrder(plan: Plan): Promise<Order> {
  const { amountPaise } = PLANS[plan]
  if (!hasRazorpay()) {
    return { orderId: `order_mock_${randomUUID()}`, amount: amountPaise, currency: 'INR', keyId: null, mock: true }
  }
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Basic ${auth}` },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt: `pp_${plan}_${Date.now()}` }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`razorpay order ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const o = (await res.json()) as { id: string; amount: number; currency: string }
  return { orderId: o.id, amount: o.amount, currency: o.currency, keyId: process.env.RAZORPAY_KEY_ID!, mock: false }
}

/** Verify Razorpay's checkout signature: HMAC_SHA256(order_id|payment_id, secret). */
export function verifyPayment(orderId: string, paymentId: string, signature: string): boolean {
  if (!hasRazorpay()) return true // mock: accept (dev only)
  const expected = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature || '')
  return a.length === b.length && timingSafeEqual(a, b)
}
