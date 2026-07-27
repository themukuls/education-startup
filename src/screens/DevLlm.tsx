import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneFrame from '../components/PhoneFrame'
import {
  getLlmConfig,
  setLlmConfig,
  testLlm,
  PROVIDER_LABELS,
  PROVIDER_DEFAULT_MODEL,
  type LlmConfig,
  type LlmProvider,
  type LlmTestResult,
} from '../api/llm'
import { c, serif } from '../theme'

const PROVIDERS: LlmProvider[] = ['anthropic', 'openai', 'groq', 'gemini']

// Developer / LLM settings — a TESTING panel. Enter your own provider key to run
// real generation against Claude / GPT / Groq / Gemini. The key is stored on
// this device and sent to our backend, which makes the call. Not for end users.
export default function DevLlm() {
  const nav = useNavigate()
  const existing = getLlmConfig()
  const [provider, setProvider] = useState<LlmProvider>(existing?.provider ?? 'groq')
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? '')
  const [model, setModel] = useState(existing?.model ?? '')
  const [baseUrl, setBaseUrl] = useState(existing?.baseUrl ?? '')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<LlmTestResult | null>(null)
  const [saved, setSaved] = useState(false)

  const cfg = (): LlmConfig => ({ provider, apiKey: apiKey.trim(), model: model.trim() || undefined, baseUrl: baseUrl.trim() || undefined })
  const showBase = provider === 'openai' || provider === 'groq'

  function save() {
    setLlmConfig(apiKey.trim() ? cfg() : null)
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
  }
  function clearAll() {
    setLlmConfig(null)
    setApiKey('')
    setModel('')
    setBaseUrl('')
    setResult(null)
  }
  async function runTest() {
    setTesting(true)
    setResult(null)
    try {
      setResult(await testLlm(cfg()))
    } catch (err) {
      setResult({ ok: false, error: String((err as Error).message ?? err) })
    } finally {
      setTesting(false)
    }
  }

  return (
    <PhoneFrame bg={c.home} time="7:42" contentStyle={{ padding: '18px 22px 30px', color: c.ink }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={() => nav('/you')} style={{ background: 'none', border: 'none', fontSize: 20, color: c.ink3 }} aria-label="Back">‹</button>
        <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 24, margin: 0 }}>Developer · LLM</h2>
      </div>

      <div style={{ background: c.amberWash, border: `1px solid ${c.amber}`, borderRadius: 12, padding: '10px 13px', marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: c.amberDark, fontWeight: 600, lineHeight: 1.45 }}>
          🧪 Testing only. Your key is stored on this device and sent to the ParentProof backend, which makes the call.
          Production uses a server-side key instead.
        </p>
      </div>

      <label style={label}>Provider</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {PROVIDERS.map((p) => {
          const on = p === provider
          return (
            <button
              key={p}
              onClick={() => setProvider(p)}
              style={{
                textAlign: 'left',
                background: on ? c.blue : c.white,
                color: on ? '#fff' : c.ink,
                border: `1.5px solid ${on ? c.blue : c.line3}`,
                borderRadius: 12,
                padding: '11px 13px',
                fontSize: 13.5,
                fontWeight: 800,
                fontFamily: 'inherit',
              }}
            >
              {PROVIDER_LABELS[p]}
            </button>
          )
        })}
      </div>

      <label style={label}>API key</label>
      <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="paste your key" type="password" style={input} />

      <label style={label}>Model <span style={{ color: c.ink4, fontWeight: 600 }}>(optional)</span></label>
      <input value={model} onChange={(e) => setModel(e.target.value)} placeholder={PROVIDER_DEFAULT_MODEL[provider]} style={input} />

      {showBase && (
        <>
          <label style={label}>Base URL <span style={{ color: c.ink4, fontWeight: 600 }}>(optional)</span></label>
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1'} style={input} />
        </>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button onClick={save} style={{ flex: 1, background: c.blue, color: '#fff', border: 'none', borderRadius: 13, padding: 14, fontSize: 14.5, fontWeight: 800, fontFamily: 'inherit' }}>
          {saved ? 'Saved ✓' : 'Save'}
        </button>
        <button onClick={runTest} disabled={!apiKey.trim() || testing} style={{ flex: 1, background: c.white, color: c.blue, border: `1.5px solid ${c.blueBorder}`, borderRadius: 13, padding: 14, fontSize: 14.5, fontWeight: 800, fontFamily: 'inherit', opacity: !apiKey.trim() || testing ? 0.5 : 1 }}>
          {testing ? 'Testing…' : 'Test connection'}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: 14, background: result.ok ? '#EAF6F0' : c.redWash, border: `1px solid ${result.ok ? '#B7E0CC' : c.redBorder}`, borderRadius: 12, padding: '12px 14px' }}>
          {result.ok ? (
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E7A50', lineHeight: 1.5 }}>
              ✓ Connected — {result.provider} · {result.model}
              {result.sample ? <div style={{ color: c.ink2, fontWeight: 600, marginTop: 3 }}>reply: “{result.sample}”</div> : null}
            </div>
          ) : result.mode === 'mock' ? (
            <div style={{ fontSize: 13, fontWeight: 700, color: c.amberDark }}>{result.message}</div>
          ) : (
            <div style={{ fontSize: 12.5, fontWeight: 700, color: c.redInk, lineHeight: 1.45, wordBreak: 'break-word' }}>✕ {result.error}</div>
          )}
        </div>
      )}

      <button onClick={clearAll} style={{ background: 'none', border: 'none', color: c.ink3, fontSize: 13, fontWeight: 700, marginTop: 16, textAlign: 'center' }}>
        Clear key & use mock
      </button>
    </PhoneFrame>
  )
}

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  color: c.ink3,
  margin: '0 0 6px',
}
const input: React.CSSProperties = {
  width: '100%',
  border: `1.5px solid ${c.line3}`,
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 15,
  fontWeight: 600,
  fontFamily: 'inherit',
  color: c.ink,
  background: c.white,
  outline: 'none',
  marginBottom: 14,
}
