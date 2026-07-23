// Lightweight account claim — persist the parent's name + phone (and how they
// linked) when they choose to save their guest progress. Full auth (WhatsApp
// inbound verification, sessions) comes later.

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export async function saveAccount(name: string, phone: string, channel = 'manual'): Promise<void> {
  const res = await fetch(`${API_BASE}/api/account`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, phone, channel }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`account save failed: ${res.status}`)
}
