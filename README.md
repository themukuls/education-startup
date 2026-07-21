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

## What's next (LLM layer — Phase 2/3)

No backend yet. The next layer is two narrow LLM jobs behind a small server that
holds the API key: **question generation** from syllabus position, and **prose
rendering** of the engine's chosen insight (with a banned-words guardrail). Both
are single `claude-opus-4-8` calls with structured outputs; the engine above
stays the source of every number.

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
