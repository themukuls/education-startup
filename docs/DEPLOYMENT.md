# Deployment & domain architecture

The rule: **the client only ever resolves domains you own.** Old app installs
hard-code whatever endpoint they shipped with; if that endpoint is a vendor
domain (`*.supabase.co`, `*.onrender.com`), you can never move off it without
forcing every user onto a new build. Put a first-party domain in front of
everything and you can re-point the origin with a DNS change instead of a
release. It's an afternoon now and near-impossible to retrofit at 50k installs.

```
                     ┌ first-party, Cloudflare-proxied ┐
  Browser / app  ──▶  https://api.parentproof.app  ──▶  backend service (Render/Railway/Fly)
  (VITE_API_BASE)                                          │  server-side only
                                                           ▼
                                             Supabase Postgres (Mumbai, ap-south-1)
```

The client **never** resolves `*.supabase.co` or the backend host. The database
lives behind our own API — the React app has no Supabase SDK and no vendor URL
in its critical path (only `wa.me` deep links, which launch the WhatsApp app and
can't/shouldn't be proxied).

---

## 1. Database — Supabase (Mumbai / ap-south-1)

1. Create the project in the **Mumbai** region (in-region storage of minors'
   data is a DPDP win, and lowest latency for Indian users).
2. Grab the connection string from **Project → Database → Connection string**.

   **Use the Session pooler (or direct connection), port `5432` — NOT the
   Transaction pooler (`6543`).** Our backend is a long-running Express process
   with its own small `pg` pool, and `node-postgres` uses prepared statements,
   which the transaction-mode pooler (Supavisor) does not support. Session mode
   / direct connection support them and are the right fit for a persistent
   server. (Only switch to the transaction pooler if you later move to
   serverless functions — and then disable prepared statements.)

3. SSL is required; `PostgresStore` enables it automatically for any non-local
   host, so no code change is needed.

```
DATABASE_URL=postgres://postgres.<ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
```

On first boot the backend creates its schema and seeds Mukul's demo history
automatically — nothing to run by hand.

## 2. Backend — Express as an always-on service (Render / Railway / Fly)

Deploy `server/index.ts` (`npm run server:start`). Set:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the Supabase session-pooler URL above |
| `ANTHROPIC_API_KEY` | real key → live question/prose (unset = mock) |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` | live WhatsApp send (unset = mock) |
| `CORS_ORIGIN` | `https://<your-vercel-app>` (locks the API to your frontend) |

Verify: `GET /api/health` should report `"db":"postgres"`.

## 3. First-party API domain via Cloudflare

The backend's own URL (`your-app.onrender.com`) must never reach the client.
Front it with a domain you control:

**Simple (recommended): a proxied CNAME.**
1. Add `api.parentproof.app` as a custom domain on the backend host (Render:
   *Settings → Custom Domains*).
2. In Cloudflare DNS, add `CNAME api → your-app.onrender.com`, **proxied**
   (orange cloud). Cloudflare now terminates TLS for `api.parentproof.app` and
   forwards to the origin.
3. To move backend hosts later, change this one CNAME — no app release.

**More control (optional): a Cloudflare Worker reverse proxy** (`infra/api-proxy.worker.js`).
Deploy it on the `api.parentproof.app` route when you want to add caching,
header rewriting, or origin failover without touching the app.

## 4. Frontend — Vercel

Build with the **first-party** API base (never the raw host):

```
VITE_API_BASE=https://api.parentproof.app
VITE_WA_BUSINESS_NUMBER=9180XXXXXXXX
```

Then set `CORS_ORIGIN` on the backend to your Vercel origin. Done: the SPA calls
your live API and stops falling back to synthetic data.

---

## The same rule for every future third-party domain

An edtech app accretes vendor SDKs — analytics, auth, video/CDN, push. Each one
adds a domain the client resolves directly, and each is a future migration trap.
For anything the client must reach:

- [ ] Front it behind a first-party subdomain (`analytics.parentproof.app`,
      `cdn.parentproof.app`, `auth.parentproof.app`) proxied via Cloudflare, so
      the vendor host never appears in a shipped build.
- [ ] Keep the vendor domain in **config/env**, not hard-coded in a component.
- [ ] Prefer talking to vendors **server-side** (as we do with Supabase) so the
      client resolves nothing at all — the strongest version of the rule.
- **Acknowledged exception:** `wa.me` / WhatsApp deep links. These launch the
  installed WhatsApp app rather than fetch data; there's nothing to proxy, and
  it's not on the data critical path.
