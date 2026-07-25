// Provider-agnostic LLM layer. One shape (`complete`) dispatched to per-vendor
// adapters, with credentials resolved from either a request (BYOK testing:
// x-llm-* headers set from the frontend) or the environment (production). The
// question/prose guardrails downstream never change regardless of provider.

import type { Request } from 'express'
import { openaiComplete } from './openai.ts'
import { geminiComplete } from './gemini.ts'
import { anthropicComplete } from './anthropic.ts'

export type ProviderName = 'anthropic' | 'openai' | 'groq' | 'gemini'

export interface LlmCreds {
  provider: ProviderName
  apiKey: string
  model: string
  baseUrl?: string
}

export interface CompleteOpts {
  system: string
  user: string
  json?: boolean
  maxTokens?: number
  temperature?: number
  timeoutMs?: number
}

const PROVIDERS: ProviderName[] = ['anthropic', 'openai', 'groq', 'gemini']

// Sensible fallbacks; the BYOK panel and env both let you override the model.
// (No hard-coding of any one deployment's model — these are just defaults.)
const DEFAULT_MODEL: Record<ProviderName, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
  gemini: 'gemini-2.0-flash',
}
const DEFAULT_BASE: Partial<Record<ProviderName, string>> = {
  groq: 'https://api.groq.com/openai/v1',
}

function isProvider(v: string | undefined): v is ProviderName {
  return !!v && (PROVIDERS as string[]).includes(v)
}

/** BYOK: credentials passed from the frontend as headers (testing mode). */
export function credsFromHeaders(req: Request): LlmCreds | null {
  const provider = req.header('x-llm-provider')
  const apiKey = req.header('x-llm-key')
  if (!isProvider(provider) || !apiKey) return null
  return {
    provider,
    apiKey,
    model: req.header('x-llm-model') || DEFAULT_MODEL[provider],
    baseUrl: req.header('x-llm-base') || DEFAULT_BASE[provider],
  }
}

/** Production: credentials from the server environment. */
export function credsFromEnv(): LlmCreds | null {
  const explicit = process.env.LLM_PROVIDER
  const provider: ProviderName | undefined = isProvider(explicit)
    ? explicit
    : process.env.ANTHROPIC_API_KEY
      ? 'anthropic'
      : process.env.GEMINI_API_KEY
        ? 'gemini'
        : process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY
          ? 'openai'
          : undefined
  if (!provider) return null
  const apiKey =
    provider === 'anthropic'
      ? process.env.ANTHROPIC_API_KEY
      : provider === 'gemini'
        ? process.env.GEMINI_API_KEY
        : process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY
  if (!apiKey) return null
  return {
    provider,
    apiKey,
    model: process.env.LLM_MODEL || DEFAULT_MODEL[provider],
    baseUrl: process.env.LLM_BASE_URL || DEFAULT_BASE[provider],
  }
}

/** Request creds (BYOK) win over env; null → run in mock mode. */
export function pickCreds(req: Request): LlmCreds | null {
  return credsFromHeaders(req) ?? credsFromEnv()
}

/** True when the server itself is configured (health/log). BYOK is per-request. */
export function hasEnvLlm(): boolean {
  return !!credsFromEnv()
}

async function complete(creds: LlmCreds, opts: CompleteOpts): Promise<string> {
  switch (creds.provider) {
    case 'anthropic':
      return anthropicComplete(creds, opts)
    case 'gemini':
      return geminiComplete(creds, opts)
    case 'groq':
      return openaiComplete({ ...creds, baseUrl: creds.baseUrl || DEFAULT_BASE.groq }, opts)
    case 'openai':
      return openaiComplete(creds, opts)
  }
}

export async function llmText(creds: LlmCreds, opts: Omit<CompleteOpts, 'json'>): Promise<string> {
  return complete(creds, { ...opts, json: false })
}

export async function llmJson<T>(creds: LlmCreds, opts: Omit<CompleteOpts, 'json'>): Promise<T> {
  const raw = await complete(creds, { ...opts, json: true })
  return parseJson(raw) as T
}

/** Defensively pull the first JSON object out of a model response. */
export function parseJson(text: string): Record<string, unknown> {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fence ? fence[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('no JSON object in model response')
  return JSON.parse(body.slice(start, end + 1))
}
