import { describe, it, expect, afterEach } from 'vitest'
import type { Request } from 'express'
import { credsFromHeaders, credsFromEnv, pickCreds } from './index'

// minimal Request stub — only .header() is used
function req(headers: Record<string, string>): Request {
  return { header: (k: string) => headers[k.toLowerCase()] } as unknown as Request
}

const ENV_KEYS = ['LLM_PROVIDER', 'LLM_MODEL', 'LLM_BASE_URL', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY', 'GROQ_API_KEY']
afterEach(() => ENV_KEYS.forEach((k) => delete process.env[k]))

describe('LLM credential resolution', () => {
  it('reads BYOK headers and applies the default model', () => {
    const c = credsFromHeaders(req({ 'x-llm-provider': 'groq', 'x-llm-key': 'gsk_x' }))
    expect(c).toMatchObject({ provider: 'groq', apiKey: 'gsk_x', model: 'llama-3.3-70b-versatile' })
  })

  it('honours an explicit header model + base url', () => {
    const c = credsFromHeaders(req({ 'x-llm-provider': 'openai', 'x-llm-key': 'sk', 'x-llm-model': 'gpt-4o', 'x-llm-base': 'https://x/v1' }))
    expect(c).toMatchObject({ provider: 'openai', model: 'gpt-4o', baseUrl: 'https://x/v1' })
  })

  it('returns null without provider or key', () => {
    expect(credsFromHeaders(req({ 'x-llm-provider': 'openai' }))).toBeNull()
    expect(credsFromHeaders(req({ 'x-llm-key': 'sk' }))).toBeNull()
    expect(credsFromHeaders(req({ 'x-llm-provider': 'bogus', 'x-llm-key': 'sk' }))).toBeNull()
  })

  it('infers env provider from whichever key is set', () => {
    process.env.GEMINI_API_KEY = 'g'
    expect(credsFromEnv()).toMatchObject({ provider: 'gemini', apiKey: 'g' })
  })

  it('request creds win over env', () => {
    process.env.ANTHROPIC_API_KEY = 'a'
    const c = pickCreds(req({ 'x-llm-provider': 'groq', 'x-llm-key': 'gsk' }))
    expect(c?.provider).toBe('groq')
  })

  it('is mock (null) when nothing is configured', () => {
    expect(pickCreds(req({}))).toBeNull()
  })
})
