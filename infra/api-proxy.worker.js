// Optional Cloudflare Worker: reverse-proxy api.parentproof.app -> your backend.
//
// Why: the client only ever resolves api.parentproof.app (a domain you own), so
// you can move the backend host by changing ORIGIN here (or a proxied CNAME) —
// never by shipping a new app build. See docs/DEPLOYMENT.md.
//
// Deploy: wrangler deploy, route = api.parentproof.app/*. Set ORIGIN as a
// Worker var/secret. A simple proxied CNAME (orange cloud) achieves the same
// re-pointing; use this Worker only when you want caching, header rewriting, or
// origin failover.

export default {
  async fetch(request, env) {
    const ORIGIN = env.ORIGIN // e.g. https://parentproof-api.onrender.com
    if (!ORIGIN) return new Response('ORIGIN not configured', { status: 500 })

    const incoming = new URL(request.url)
    const target = new URL(incoming.pathname + incoming.search, ORIGIN)

    // Forward the request unchanged except for the Host (set to the origin).
    const headers = new Headers(request.headers)
    headers.set('Host', new URL(ORIGIN).host)
    headers.set('X-Forwarded-Host', incoming.host)

    const resp = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    })

    // Pass the response through; add HSTS. CORS is handled by the backend
    // (CORS_ORIGIN), so we don't rewrite it here.
    const out = new Headers(resp.headers)
    out.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    return new Response(resp.body, { status: resp.status, headers: out })
  },
}
