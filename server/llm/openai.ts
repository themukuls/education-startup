// OpenAI-compatible chat completions — covers OpenAI, Groq, Together, and any
// other endpoint that speaks the /chat/completions shape. The provider is
// selected purely by baseUrl, so "Groq" is just this adapter pointed elsewhere.

import type { LlmCreds, CompleteOpts } from './index.ts'

export async function openaiComplete(creds: LlmCreds, opts: CompleteOpts): Promise<string> {
  const base = (creds.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${creds.apiKey}` },
    body: JSON.stringify({
      model: creds.model,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      max_tokens: opts.maxTokens ?? 4000,
      temperature: opts.temperature ?? 0.4,
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
  })
  if (!res.ok) throw new Error(`openai(${creds.model}) ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return data.choices?.[0]?.message?.content ?? ''
}
