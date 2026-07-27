import { useEffect, useState } from 'react'

/** Wide screens (laptop/desktop) get the sidebar app-shell + multi-column
 * layouts; below this we fall back to the single-column mobile app. */
export const DESKTOP_MIN = 960

const query = `(min-width:${DESKTOP_MIN}px)`

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && 'matchMedia' in window ? window.matchMedia(query).matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setIsDesktop(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}
