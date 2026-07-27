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
