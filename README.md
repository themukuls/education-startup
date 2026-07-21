# ParentProof

> You pay for their education. We prove whether it's working.

The independent learning-audit app for Indian parents. Mobile-first web app,
built so the **same build** can be wrapped into native iOS / Android apps via
Capacitor — no rewrite.

This implements `ParentProof.dc.html` (the Claude Design canvas) as a real,
navigable React app: 13 screens across the full retention loop
**Hook → Ritual → Payoff → Investment → Commitment**, each engineered on a
named retention principle from the design.

## Stack

- **React 18 + TypeScript + Vite** — fast, zero-config, small bundle
- **React Router** (`HashRouter`) — works from a static host *and* from the
  `file://` origin Capacitor serves from
- **Capacitor-ready** — relative asset base, hash routing, `capacitor.config.ts`
  in place. See "Going native" below.

## The learning-tracker engine (`src/engine/`)

The core product logic — a **deterministic, zero-ML rating engine** that turns a
stream of answered-question events into the five parent-facing signals
(**mastery, retention, speed, carefulness, consistency**), a chapter ledger, and
one weekly insight. It implements the Learning & Progress Tracker spec, layer by
layer:

```
raw events → enrichment (speed ratio, error class, lucky flag)   [enrich.ts]
           → skill ledger (readiness, rote gap, memory decay)     [ledger.ts]
           → trackers (velocity, consistency, stamina, exam-skill)[trackers.ts]
           → 5 ratings with data floors                           [ratings.ts]
           → insight selector v1 (score = z × A × N, rules only)  [insights.ts]
```

**Design contract:** every parent-facing number originates in the engine — no
LLM ever invents a claim or a metric. The engine is pure, deterministic (a
seeded generator, no `Date.now()`), and unit-tested (`npm test`, 10 tests
covering archetype behaviour and the cold-start data floors). The app's Learning
Tracker, Diagnosis Card, Home hero, and Term Audit all read from
`computeReport()` — nothing is hardcoded.

`src/engine/synthetic.ts` builds realistic event streams (improver / rusher /
crammer / fader / cold-start) for tests and for seeding the demo.

## The LLM layer — question generation (`server/`)

A small Express backend holds the Anthropic key and exposes `POST
/api/generate-test`. Given a syllabus position (board / class / subject /
chapter) it:

1. **Generates** items with `claude-opus-4-8` (adaptive thinking, high effort,
   structured-output schema) — misconception-targeted distractors, R/U/A mix.
2. **Verifies** every item with a second, independent blind pass that re-solves
   the question and **drops any whose marked answer it can't confirm** — a
   hallucinated answer key must never reach a child.
3. **Validates** structurally (exactly 4 unique non-empty options, in-range
   answer index, valid enums) via the shared guardrail in `src/shared/quiz.ts`.

Without an API key the server runs in **mock mode** (returns the vetted static
bank), so the whole app + integration path runs offline and in demos. The client
(`src/api/quiz.ts`) calls the backend and **falls back to the static bank** on
any failure, so a test always loads.

```bash
cp .env.example .env      # add ANTHROPIC_API_KEY for real generation (optional)
npm run server            # API on :8787  (mock mode if no key)
npm run dev               # web app on :5173, proxies /api → :8787
```

`npm test` covers both the engine (10) and the question guardrail (8).

## The LLM layer — prose rendering (`POST /api/render-card`)

The second LLM job turns the engine's **chosen** insight into a warm,
parent-facing card. Given the engine's finding + evidence + action, it rewrites
them under the template contract with `claude-opus-4-8`. The guardrail
(`src/shared/card.ts` → `checkCard`) then enforces the design contract:

- **No banned language** — trait / ability / shaming words (intelligent, smart,
  IQ, lazy, careless, weak, behind, failing, …) are rejected as whole words.
- **No invented numbers** — every figure in the copy must come from the
  engine's input (plus 5/10/15 minute framing); the model can rephrase but
  can't fabricate a statistic. The parent card keeps ≤2 numbers.

On a violation it retries once, then **falls back to the engine's own copy** —
which is safe by construction. Mock mode (no key) returns that same copy. So the
insight card always renders, and a hallucinated claim can never reach a parent.

`npm test` covers the engine (10), the question guardrail (8), and the language
guardrail (7) — 25 tests.

## What's next

- **Real generation quality** — needs an `ANTHROPIC_API_KEY`; run a batch
  through generate → verify and review accuracy (the metric the business lives
  on).
- **WhatsApp delivery** of the rendered card (the design's screen 13).
- **Prediction vs. actual** — capture `parentEnteredMarks` (already in the event
  schema) to publish the accuracy track record.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

On a laptop the app renders inside a phone frame (390–400px device). On a real
phone or a narrow window it fills the screen edge-to-edge.

```bash
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
```

## The flow

| # | Screen | Route | Retention principle |
|---|--------|-------|---------------------|
| 01 | Value-first entry | `/` | Value before data capture |
| 02 | Build child profile | `/onboarding/child` | Endowment |
| 03 | Goal & identity | `/onboarding/goal` | You become the auditor (SDT) |
| 04 | Parent-led handoff | `/audit/intro` | Supervised ritual |
| 05 | Kid test | `/audit/test` | One path · live progress (Zeigarnik) |
| 06 | Kid finish | `/audit/complete` | Peak-end praise |
| 07 | Diagnosis Card ★ | `/diagnosis` | Variable reward · shareable proof |
| 08 | Parent home ★ | `/home` | Where you left off · one action |
| 09 | The Fix | `/fix` | Incomplete-task pull · scripted agency |
| 10 | Milestone | `/milestone` | Identity + ethical loss aversion |
| 11 | Term Audit ★ | `/term-audit` | "Is your ₹X working?" ledger |
| 12 | Upgrade | `/upgrade` | Loss aversion · anchored pricing |
| 13 | You & your children | `/you` | Parent-as-owner · DPDP consent |

The kid test (05) is interactive: 9 CBSE Class-10 quadratics items, a live
timer and progress bar; the score flows into the Diagnosis Card.

## Project structure

```
src/
  theme.ts              design tokens (colours, fonts) from the canvas
  state/AppContext.tsx  parent / child / readiness / streak state
  components/           PhoneFrame (device shell), BottomNav, ui primitives
  data/testQuestions.ts sample audit items
  screens/              the 13 screens
```

## Going native (later)

The web build is already Capacitor-compatible. When ready:

```bash
npm i -D @capacitor/cli
npm i @capacitor/core @capacitor/ios @capacitor/android
npm run build
npx cap add ios && npx cap add android
npx cap sync
npx cap open ios      # or android
```

`capacitor.config.ts` points at `dist/`. Because routing is hash-based and the
Vite `base` is relative, the same bundle runs unchanged inside the native shell.
