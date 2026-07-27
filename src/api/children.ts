// Create a child for the authenticated parent (real onboarding). The returned
// child id becomes the active child in AppContext — no more demo/global id.

import { authHeaders } from './auth'
import type { ChildDTO } from './auth'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export interface NewChild {
  name: string
  board: string
  klass: number
  subjects: string[]
  monthlySpend: number
}

export async function createChild(payload: NewChild, seedDemo = false): Promise<ChildDTO> {
  const res = await fetch(`${API_BASE}/api/children`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ ...payload, seedDemo }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`create child failed: ${res.status}`)
  const data = await res.json()
  return data.child as ChildDTO
}
