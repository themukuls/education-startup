// Razorpay checkout — mock and real. In mock mode (no Razorpay key) we create an
// order then immediately verify it (dev), activating the plan. With a real key,
// we load Razorpay's checkout and verify the signed response server-side.

import { authHeaders } from './auth'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export type Plan = 'core' | 'annual'

interface OrderResp {
  orderId: string
  amount: number
  currency: string
  keyId: string | null
  mock: boolean
  plan: Plan
  label: string
}

async function createOrder(plan: Plan): Promise<OrderResp> {
  const res = await fetch(`${API_BASE}/api/pay/order`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ plan }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`order ${res.status}`)
  return res.json()
}

async function verify(body: { orderId: string; paymentId: string; signature: string; plan: Plan }): Promise<void> {
  const res = await fetch(`${API_BASE}/api/pay/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`verify ${res.status}`)
}

function loadRazorpay(): Promise<void> {
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('could not load Razorpay'))
    document.body.appendChild(s)
  })
}

/** Run the full pay → verify → entitlement flow. Resolves with the active plan. */
export async function pay(plan: Plan, prefill?: { name?: string; contact?: string }): Promise<Plan> {
  const order = await createOrder(plan)

  // Mock (no key): the order is fake — verify straight through to activate.
  if (order.mock || !order.keyId) {
    await verify({ orderId: order.orderId, paymentId: 'pay_mock', signature: 'mock', plan })
    return plan
  }

  // Real Razorpay checkout.
  await loadRazorpay()
  return new Promise<Plan>((resolve, reject) => {
    interface RzpResp { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
    const Rzp = (window as unknown as { Razorpay: new (o: unknown) => { open: () => void } }).Razorpay
    const rzp = new Rzp({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: 'ParentProof',
      description: order.label,
      prefill: { name: prefill?.name, contact: prefill?.contact },
      theme: { color: '#2354C7' },
      handler: async (resp: RzpResp) => {
        try {
          await verify({ orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature, plan })
          resolve(plan)
        } catch (e) {
          reject(e)
        }
      },
      modal: { ondismiss: () => reject(new Error('cancelled')) },
    })
    rzp.open()
  })
}
