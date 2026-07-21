import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { c, sans } from '../theme'

/** The ParentProof diamond mark — a rotated cobalt square with an inset outline. */
export function Diamond({
  size = 34,
  bg = c.blue,
  ring = c.surface,
}: {
  size?: number
  bg?: string
  ring?: string
}) {
  const inner = Math.round(size * 0.35)
  return (
    <div
      style={{
        width: size,
        height: size,
        background: bg,
        borderRadius: size * 0.26,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: 'rotate(45deg)',
        flex: 'none',
      }}
    >
      <div
        style={{
          width: inner,
          height: inner,
          border: `${Math.max(2, size * 0.07)}px solid ${ring}`,
          borderRadius: 3,
        }}
      />
    </div>
  )
}

/** Wordmark lockup used on the entry / onboarding screens. */
export function Logo({ size = 16 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <Diamond size={size * 1.6} />
      <span style={{ fontWeight: 800, fontSize: size }}>ParentProof</span>
    </div>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'dark' | 'amber' | 'ghost'
  full?: boolean
  glow?: boolean
}

const base: CSSProperties = {
  border: 'none',
  borderRadius: 16,
  padding: 18,
  fontSize: 16,
  fontWeight: 800,
  fontFamily: sans,
}

/** Primary call-to-action button, matching the design's button styles. */
export function Btn({ variant = 'primary', full = true, glow = false, style, ...rest }: BtnProps) {
  const variants: Record<string, CSSProperties> = {
    primary: {
      background: c.blue,
      color: c.surface,
      boxShadow: glow ? '0 10px 22px -8px rgba(35,84,199,.6)' : undefined,
    },
    dark: { background: c.ink, color: c.surface },
    amber: { background: c.amber, color: c.navy },
    ghost: {
      background: c.white,
      color: c.blue,
      border: `1.5px solid ${c.blueBorder}`,
    },
  }
  return (
    <button
      {...rest}
      style={{
        ...base,
        width: full ? '100%' : undefined,
        ...variants[variant],
        ...style,
      }}
    />
  )
}

/** Small uppercase eyebrow label. */
export function Eyebrow({
  children,
  color = c.amberDeep,
  style,
}: {
  children: ReactNode
  color?: string
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        fontSize: 12.5,
        fontWeight: 800,
        letterSpacing: '.14em',
        textTransform: 'uppercase',
        color,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
