/* ParentProof service worker — offline shell only, never stale data.
 *
 * The app's entire value is a live, freshly-computed audit of a child's
 * learning. A cached report would show a parent wrong numbers about their own
 * kid, so the single hard rule here is: /api/* NEVER touches the cache. It is
 * not intercepted, not read from the cache, and not written to it.
 *
 * Everything else is a thin shell cache so the app opens on a flaky train
 * connection instead of showing the browser's dinosaur.
 *
 * Notes for future edits:
 *  - vite.config.ts uses `base: './'`, so every URL here is relative to the
 *    service worker's own location (its scope), not to the server root.
 *  - the app uses a hash router, so every route is the same document and the
 *    navigation fallback is simply index.html.
 */

const VERSION = 'v1'
const CACHE = `parentproof-shell-${VERSION}`

// The app shell. Hashed build output under assets/ is cached lazily on first
// use instead — its filenames change on every build.
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      // Individually, so one 404 can't fail the whole install.
      await Promise.all(
        SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => {})),
      )
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => k.startsWith('parentproof-shell-') && k !== CACHE)
          .map((k) => caches.delete(k)),
      )
      await self.clients.claim()
    })(),
  )
})

/** Live data — must always hit the network. Never cached, never served stale. */
function isApi(url) {
  return url.pathname.includes('/api/')
}

/** Hashed, immutable build output emitted by Vite. */
function isBuildAsset(url) {
  return url.pathname.includes('/assets/')
}

self.addEventListener('fetch', (event) => {
  const req = event.request

  // Only GET is ever cacheable.
  if (req.method !== 'GET') return

  let url
  try {
    url = new URL(req.url)
  } catch {
    return
  }

  // Cross-origin (fonts on a CDN, payment SDKs, WhatsApp) — leave it alone.
  if (url.origin !== self.location.origin) return

  // *** The rule that matters: live data bypasses the service worker entirely.
  if (isApi(url)) return

  // Hashed build assets: cache-first, they can never go stale.
  if (isBuildAsset(url)) {
    event.respondWith(
      (async () => {
        const hit = await caches.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res && res.ok && res.type === 'basic') {
          const cache = await caches.open(CACHE)
          cache.put(req, res.clone())
        }
        return res
      })(),
    )
    return
  }

  // Navigations: network-first so a deploy is picked up immediately, with the
  // cached shell as the offline fallback. Hash router → one document for all
  // routes, so index.html is always the right fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req)
          if (res && res.ok) {
            const cache = await caches.open(CACHE)
            cache.put('./index.html', res.clone())
          }
          return res
        } catch {
          const cached = (await caches.match('./index.html')) || (await caches.match('./'))
          if (cached) return cached
          return new Response('Offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          })
        }
      })(),
    )
    return
  }

  // Everything else same-origin (icons, manifest): network-first, fall back to
  // whatever we precached. Only shell entries we already hold are reused.
  event.respondWith(
    (async () => {
      try {
        return await fetch(req)
      } catch (err) {
        const hit = await caches.match(req)
        if (hit) return hit
        throw err
      }
    })(),
  )
})
