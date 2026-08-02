import { useEffect, useState, type CSSProperties } from 'react'
import { useLocation } from 'react-router-dom'
import { Diamond } from './ui'
import { c, serif } from '../theme'

// "Add to home screen" nudge.
//
// ParentProof ships as an installable PWA rather than a store app — WhatsApp is
// the notification channel, so we don't need push, and an install gate would
// wreck the sign-up-free funnel. This bar is the whole install surface.
//
// It deliberately does NOT appear on first load: a parent who has just landed
// hasn't seen anything worth keeping yet, and a banner competing with the audit
// funnel costs more than it earns. We wait until they're on a post-audit screen
// (the diagnosis or the home dashboard) and have been there a few seconds.

/** Chrome's install event — not in lib.dom yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pp.installDismissed'

// Same defensive wrapper the app state uses: localStorage throws outright in
// Safari private mode, and a home-screen nudge must never break the app.
const ls = {
  get: (k: string, fallback = '') => {
    try {
      return localStorage.getItem(k) ?? fallback
    } catch {
      return fallback
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* ignore (private mode) */
    }
  },
}

/** Routes where the parent has actually seen value. Anything earlier is funnel. */
const SHOW_ON = ['/diagnosis', '/home']
const DELAY_MS = 6000

function isStandalone() {
  try {
    const nav = navigator as Navigator & { standalone?: boolean }
    if (nav.standalone === true) return true
    return window.matchMedia('(display-mode: standalone)').matches
  } catch {
    return false
  }
}

/** iOS Safari never fires `beforeinstallprompt` — it needs manual instructions. */
function isIosSafari() {
  try {
    const ua = navigator.userAgent
    // iPadOS 13+ reports itself as a Mac; the touch points give it away.
    const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    if (!ios) return false
    // Chrome / Firefox / Edge on iOS can't install to the home screen at all.
    return !/CriOS|FxiOS|EdgiOS|OPiOS|Mercury/.test(ua)
  } catch {
    return false
  }
}

export default function InstallPrompt() {
  const { pathname } = useLocation()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [gone, setGone] = useState(() => ls.get(DISMISS_KEY) === '1' || isStandalone())
  const [ready, setReady] = useState(false)
  const [ios] = useState(isIosSafari)

  // Capture Chrome/Edge/Android's install event and hold it until we choose
  // our moment. Without preventDefault() the browser shows its own mini-bar.
  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    function onInstalled() {
      setGone(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Short dwell on an allowed route before we surface anything.
  useEffect(() => {
    if (gone || !SHOW_ON.includes(pathname)) {
      setReady(false)
      return
    }
    const t = window.setTimeout(() => setReady(true), DELAY_MS)
    return () => window.clearTimeout(t)
  }, [pathname, gone])

  function dismiss() {
    setGone(true)
    ls.set(DISMISS_KEY, '1')
  }

  async function install() {
    const evt = deferred
    if (!evt) return
    setDeferred(null)
    try {
      await evt.prompt()
      await evt.userChoice
    } catch {
      /* the event is single-use; nothing to recover */
    }
    // Either they installed it or they said no — don't ask again.
    dismiss()
  }

  if (gone || !ready) return null
  if (!deferred && !ios) return null

  return (
    <div style={wrap} role="dialog" aria-label="Add ParentProof to your home screen">
      <div style={card}>
        <Diamond size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={kicker}>Keep it one tap away</div>
          <div style={title}>Add ParentProof to your home screen</div>
          <p style={body}>
            {ios
              ? 'Tap the Share button, then “Add to Home Screen”.'
              : 'Opens like an app — no store, no sign-in.'}
          </p>
          {!ios && (
            <button onClick={install} style={cta}>
              Add to home screen
            </button>
          )}
        </div>
        <button onClick={dismiss} aria-label="Dismiss" style={close}>
          ×
        </button>
      </div>
    </div>
  )
}

// Sits clear of the fixed bottom nav (64px + safe area, see components/shell.css)
// and under the save gate's scrim (z-index 40).
const wrap: CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 12px)',
  display: 'flex',
  justifyContent: 'center',
  padding: '0 14px',
  zIndex: 25,
  pointerEvents: 'none',
}
const card: CSSProperties = {
  pointerEvents: 'auto',
  width: '100%',
  maxWidth: 430,
  display: 'flex',
  alignItems: 'flex-start',
  gap: 13,
  background: c.surface,
  border: `1px solid ${c.line3}`,
  borderRadius: 20,
  padding: '15px 14px 15px 16px',
  boxShadow: '0 18px 40px -18px rgba(15,12,8,.45)',
  animation: 'ppSlideUp .3s cubic-bezier(.2,.8,.2,1)',
}
const kicker: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  color: c.amberDeep,
}
const title: CSSProperties = {
  fontFamily: serif,
  fontWeight: 600,
  fontSize: 17,
  lineHeight: 1.2,
  color: c.ink,
  margin: '3px 0 0',
}
const body: CSSProperties = {
  margin: '5px 0 0',
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.45,
  color: c.ink2,
}
const cta: CSSProperties = {
  marginTop: 11,
  background: c.blue,
  color: '#fff',
  border: 'none',
  borderRadius: 13,
  padding: '11px 18px',
  fontSize: 14.5,
  fontWeight: 800,
  fontFamily: 'inherit',
  cursor: 'pointer',
  boxShadow: '0 10px 20px -10px rgba(35,84,199,.6)',
}
const close: CSSProperties = {
  flex: 'none',
  background: 'none',
  border: 'none',
  color: c.ink4,
  fontSize: 22,
  lineHeight: 1,
  padding: '2px 4px',
  fontFamily: 'inherit',
  cursor: 'pointer',
}
