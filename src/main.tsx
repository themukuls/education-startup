import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
// Self-hosted fonts (bundled) — no Google Fonts CDN dependency in the client.
import '@fontsource-variable/newsreader'
import '@fontsource-variable/hanken-grotesk'
import App from './App.tsx'
import { AppProvider } from './state/AppContext.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </HashRouter>
  </StrictMode>,
)

// PWA: register the offline shell worker.
// Production only, so it never fights with the dev server's HMR. The path is
// relative to match `base: './'` in vite.config.ts, which keeps the scope right
// when the app is served from a sub-directory. A failed registration is never
// allowed to affect the app — the site works fine without it.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* ignore — offline support is a progressive enhancement */
    })
  })
}
