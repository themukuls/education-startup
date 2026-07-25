// Anthropic (Claude) adapter — uses the official SDK so auth + API versioning
// are handled. The API key comes from the resolved creds (env or per-request),
// never a module-level singleton, so BYOK testing and env keys share one path.

import Anthropic from '@anthropic-ai/sdk'
import type { LlmCreds, CompleteOpts } from './index.ts'

export async function anthropicComplete(creds: LlmCreds, opts: CompleteOpts): Promise<string> {
  const client = new Anthropic({ apiKey: creds.apiKey })
  const system = opts.json
    ? `${opts.system}\n\nReturn ONLY valid, minified JSON — no prose, no markdown fences.`
    : opts.system
  const res = await client.messages.create({
    model: creds.model,
    max_tokens: opts.maxTokens ?? 4000,
    temperature: opts.temperature ?? 0.4,
    system,
    messages: [{ role: 'user', content: opts.user }],
  })
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
}
