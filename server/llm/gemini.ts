// Google Gemini (Generative Language API) adapter.

import type { LlmCreds, CompleteOpts } from './index.ts'

export async function geminiComplete(creds: LlmCreds, opts: CompleteOpts): Promise<string> {
  const base = (creds.baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '')
  const res = await fetch(`${base}/models/${creds.model}:generateContent?key=${encodeURIComponent(creds.apiKey)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: 'user', parts: [{ text: opts.user }] }],
      generationConfig: {
        ...(opts.json ? { responseMimeType: 'application/json' } : {}),
        temperature: opts.temperature ?? 0.4,
        maxOutputTokens: opts.maxTokens ?? 4000,
      },
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
  })
  if (!res.ok) throw new Error(`gemini(${creds.model}) ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  return (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('')
}
