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

## 2. Backend — Express as an always-on service (Option A)

The API is a long-running process (it can't live on Vercel-static). Host it on
Render/Railway/Fly; the repo ships a **Render blueprint** (`render.yaml`) so it's
a few clicks. `tsx` is a runtime dependency and the server binds `process.env.PORT`
on all interfaces, so no build step or config is needed beyond the env vars.

**Render (recommended):**
1. **New → Blueprint**, connect this repo. Render reads `render.yaml` and creates
   the `parentproof-api` web service (build `npm install`, start
   `npm run server:start`, health check `/api/health`).
2. In the service's **Environment**, set the secrets (all marked `sync:false`,
   so they're never in git):

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Supabase **session pooler**, port **5432** (from step 1) |
   | `CORS_ORIGIN` | `https://<your-vercel-app>` — locks the API to your frontend |
   | `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `OPENAI_API_KEY` / `GROQ_API_KEY` | optional; unset = mock |
   | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` | optional; unset = mock |

3. Deploy. On first boot it creates the schema in Supabase and seeds the demo.

**Railway** is equivalent: new project from repo, start command
`npm run server:start`, same env vars. (Fly too — add a `fly.toml`.)

Verify: `GET https://<your-service>/api/health` → `{"db":"postgres", ...}`, and
Supabase's Table Editor shows the seeded rows. Note: Render's **free** plan
sleeps on idle (first request after idle is slow) — fine for testing, upgrade
for production.

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
