import { useNavigate } from 'react-router-dom'
import { c } from '../theme'

type Tab = 'home' | 'tests' | 'progress' | 'fixes' | 'you'

const tabs: { key: Tab; label: string; to: string; icon: (active: boolean) => JSX.Element }[] = [
  {
    key: 'home',
    label: 'Home',
    to: '/home',
    icon: (a) => <div style={{ width: 20, height: 20, border: `2.5px solid ${a ? c.blue : c.ink4}`, borderRadius: 6 }} />,
  },
  {
    key: 'tests',
    label: 'Tests',
    to: '/audit/intro',
    icon: (a) => <div style={{ width: 20, height: 20, border: `2px solid ${a ? c.blue : c.ink4}`, borderRadius: '50%' }} />,
  },
  {
    key: 'progress',
    label: 'Progress',
    to: '/tracker',
    icon: (a) => <div style={{ width: 20, height: 14, border: `2px solid ${a ? c.blue : c.ink4}`, borderRadius: 3 }} />,
  },
  {
    key: 'fixes',
    label: 'Fixes',
    to: '/fix',
    icon: (a) => (
      <div style={{ width: 20, height: 20, border: `2px solid ${a ? c.blue : c.ink4}`, borderRadius: 6, transform: 'rotate(45deg)' }} />
    ),
  },
  {
    key: 'you',
    label: 'You',
    to: '/you',
    icon: (a) => <div style={{ width: 18, height: 18, border: `2px solid ${a ? c.blue : c.ink4}`, borderRadius: '50%' }} />,
  },
]

export default function BottomNav({ active }: { active: Tab }) {
  const nav = useNavigate()
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 70,
        background: c.white,
        borderTop: `1px solid ${c.line2}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 20px 8px',
        zIndex: 15,
      }}
    >
      {tabs.map((t) => {
        const isActive = t.key === active
        return (
          <button
            key={t.key}
            onClick={() => nav(t.to)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              color: isActive ? c.blue : c.ink4,
              padding: 0,
            }}
          >
            {t.icon(isActive)}
            <span style={{ fontSize: 10.5, fontWeight: isActive ? 800 : 700 }}>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}
