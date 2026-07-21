import type { CSSProperties, ReactNode } from 'react'
import './phone.css'

type Tint = 'dark' | 'light'

interface PhoneFrameProps {
  children: ReactNode
  /** Background of the screen surface (colour or gradient). */
  bg?: string
  /** Status-bar / home-indicator ink. 'dark' for light screens, 'light' for dark screens. */
  tint?: Tint
  /** Clock shown in the status bar. */
  time?: string
  /** Colour of the notch pill (kid/dark screens use a darker notch). */
  notch?: string
  /** Extra padding applied to the scroll content. */
  contentStyle?: CSSProperties
  /** Rendered above the home indicator, outside the scroll area (e.g. bottom nav). */
  footer?: ReactNode
  /** Battery fill percentage (0-100). */
  battery?: number
}

export default function PhoneFrame({
  children,
  bg = '#FBF8F2',
  tint = 'dark',
  time = '9:41',
  notch = '#1E1B16',
  contentStyle,
  footer,
  battery = 80,
}: PhoneFrameProps) {
  const inkColor = tint === 'dark' ? '#1E1B16' : '#D4DDF6'
  return (
    <div className="pp-device pp-screen-enter" style={{ background: bg }}>
      <div className="pp-notch" style={{ background: notch }} />

      <div className="pp-statusbar" style={{ color: inkColor }}>
        <span className="pp-time">{time}</span>
        <div className="pp-signal">
          <span className="pp-5g">5G</span>
          <div className="pp-batt" style={{ border: `1.5px solid ${inkColor}` }}>
            <i style={{ width: `${battery}%`, background: inkColor }} />
          </div>
        </div>
      </div>

      <div className="pp-content pp-scroll" style={contentStyle}>
        {children}
      </div>

      {footer}

      <div className="pp-home-indicator" style={{ background: inkColor }} />
    </div>
  )
}
