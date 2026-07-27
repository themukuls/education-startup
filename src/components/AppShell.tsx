import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import SaveGate from './SaveGate'
import { Diamond } from './ui'
import { useApp } from '../state/AppContext'
import { c } from '../theme'
import './shell.css'

export type NavKey = 'home' | 'progress' | 'accuracy' | 'you'

const NAV: { key: NavKey; label: string; to: string; icon: (a: boolean) => ReactNode }[] = [
  { key: 'home', label: 'Home', to: '/home', icon: (a) => <Ico shape="square" active={a} /> },
  { key: 'progress', label: 'Progress', to: '/tracker', icon: (a) => <Ico shape="bars" active={a} /> },
  { key: 'accuracy', label: 'Accuracy', to: '/accuracy', icon: (a) => <Ico shape="target" active={a} /> },
  { key: 'you', label: 'You', to: '/you', icon: (a) => <Ico shape="circle" active={a} /> },
]

/**
 * Responsive product shell. Desktop (>=960px): a persistent left sidebar with
 * nav + account, and a wide centred content column. Phone: content fills the
 * screen with a fixed bottom nav. No fake device chrome — this is the real app.
 */
export default function AppShell({ active, children }: { active: NavKey; children: ReactNode }) {
  const nav = useNavigate()
  const { parentName, parentInitial, child, accountStatus, openSaveGate } = useApp()
  const isGuest = accountStatus === 'guest'

  return (
    <div className="pp-app pp-screen-enter">
      {/* ---- Sidebar (desktop) ---- */}
      <aside className="pp-sidebar">
        <button onClick={() => nav('/home')} style={logoBtn}>
          <Diamond size={30} />
          <span style={{ fontWeight: 800, fontSize: 17 }}>ParentProof</span>
        </button>

        <button onClick={() => nav('/audit/intro')} style={startBtn}>
          + Start a test
        </button>

        <nav className="pp-side-nav">
          {NAV.map((t) => (
            <button key={t.key} className={`pp-side-link${t.key === active ? ' active' : ''}`} onClick={() => nav(t.to)}>
              {t.icon(t.key === active)}
              {t.label}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <button onClick={() => (isGuest ? openSaveGate() : nav('/you'))} style={acctChip}>
            <div style={acctAvatar}>{isGuest ? '👋' : parentInitial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: c.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isGuest ? 'Guest' : parentName}
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: isGuest ? c.amberDeep : c.ink3 }}>
                {isGuest ? 'Tap to save your record' : `${child.name} · Class ${child.klass}`}
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* ---- Main content ---- */}
      <main className="pp-main">
        <div className="pp-mainwrap">{children}</div>
      </main>

      {/* ---- Bottom nav (phone) ---- */}
      <nav className="pp-bottomnav">
        {NAV.map((t) => {
          const on = t.key === active
          return (
            <button key={t.key} className="pp-tab" onClick={() => nav(t.to)} style={{ color: on ? c.blue : c.ink4 }}>
              {t.icon(on)}
              <span className="pp-tab-label" style={{ fontWeight: on ? 800 : 700 }}>
                {t.label}
              </span>
            </button>
          )
        })}
      </nav>

      <SaveGate />
    </div>
  )
}

function Ico({ shape, active }: { shape: 'square' | 'bars' | 'target' | 'circle'; active: boolean }) {
  const col = active ? c.blue : c.ink4
  const s = 20
  if (shape === 'bars') return <div style={{ width: s, height: 14, border: `2px solid ${col}`, borderRadius: 3, flex: 'none' }} />
  if (shape === 'circle') return <div style={{ width: 18, height: 18, border: `2px solid ${col}`, borderRadius: '50%', flex: 'none' }} />
  if (shape === 'target')
    return (
      <div style={{ width: s, height: s, border: `2px solid ${col}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: col }} />
      </div>
    )
  return <div style={{ width: s, height: s, border: `2.5px solid ${col}`, borderRadius: 6, flex: 'none' }} />
}

const logoBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  background: 'none',
  border: 'none',
  padding: '2px 4px',
  color: c.ink,
}
const startBtn: React.CSSProperties = {
  marginTop: 22,
  width: '100%',
  background: c.blue,
  color: '#fff',
  border: 'none',
  borderRadius: 13,
  padding: '12px 14px',
  fontSize: 14.5,
  fontWeight: 800,
  fontFamily: 'inherit',
  boxShadow: '0 8px 18px -10px rgba(35,84,199,.7)',
}
const acctChip: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 11,
  width: '100%',
  background: c.home,
  border: `1px solid ${c.line2}`,
  borderRadius: 14,
  padding: '10px 12px',
  fontFamily: 'inherit',
  textAlign: 'left',
}
const acctAvatar: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  background: c.blue,
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 900,
  fontSize: 15,
  flex: 'none',
}
