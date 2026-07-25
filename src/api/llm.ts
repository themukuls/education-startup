// BYOK LLM config — a TESTING affordance. The tester enters their own provider
// key on their own device; it's stored in localStorage and sent as headers to
// OUR backend (which makes the provider call, avoiding browser CORS). For
// production with real parents, keys live in server env instead and this panel
// is disabled — same server-side code path.

const API_BASE = import.meta.env.VITE_API_BASE ?? ''
const KEY = 'pp.llm'

export type LlmProvider = 'anthropic' | 'openai' | 'groq' | 'gemini'

export interface LlmConfig {
  provider: LlmProvider
  apiKey: string
  model?: string
  baseUrl?: string
}

export const PROVIDER_LABELS: Record<LlmProvider, string> = {
  anthropic: 'Claude (Anthropic)',
  openai: 'GPT (OpenAI)',
  groq: 'Groq',
  gemini: 'Gemini (Google)',
}

/** Default model shown as a placeholder; the backend has matching fallbacks. */
export const PROVIDER_DEFAULT_MODEL: Record<LlmProvider, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
  gemini: 'gemini-2.0-flash',
}

export function getLlmConfig(): LlmConfig | null {
  try {
    const s = localStorage.getItem(KEY)
    return s ? (JSON.parse(s) as LlmConfig) : null
  } catch {
    return null
  }
}

export function setLlmConfig(cfg: LlmConfig | null): void {
  try {
    if (cfg && cfg.apiKey) localStorage.setItem(KEY, JSON.stringify(cfg))
    else localStorage.removeItem(KEY)
  } catch {
    /* ignore (private mode) */
  }
}

/** Headers that carry the BYOK creds to the backend. Empty when unset. */
export function llmHeaders(): Record<string, string> {
  const c = getLlmConfig()
  if (!c?.apiKey) return {}
  const h: Record<string, string> = { 'x-llm-provider': c.provider, 'x-llm-key': c.apiKey }
  if (c.model) h['x-llm-model'] = c.model
  if (c.baseUrl) h['x-llm-base'] = c.baseUrl
  return h
}

export interface LlmTestResult {
  ok: boolean
  mode?: 'mock'
  provider?: string
  model?: string
  sample?: string
  message?: string
  error?: string
}

/** Round-trip test a config against the backend (which calls the provider). */
export async function testLlm(cfg: LlmConfig): Promise<LlmTestResult> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (cfg.apiKey) {
    headers['x-llm-provider'] = cfg.provider
    headers['x-llm-key'] = cfg.apiKey
    if (cfg.model) headers['x-llm-model'] = cfg.model
    if (cfg.baseUrl) headers['x-llm-base'] = cfg.baseUrl
  }
  const res = await fetch(`${API_BASE}/api/llm/test`, {
    method: 'POST',
    headers,
    body: '{}',
    signal: AbortSignal.timeout(25_000),
  })
  return res.json()
}
