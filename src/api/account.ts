// Lightweight account claim — persist the parent's name + phone when they
// choose to save their guest progress. Full auth (OTP, sessions) comes later.

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export async function saveAccount(name: string, phone: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/account`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, phone }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`account save failed: ${res.status}`)
}
