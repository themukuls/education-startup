# LLM providers & RAG — plan

Two goals: (1) call **any** model provider (Gemini, Claude, …) behind one
interface, and (2) **ground** generation in the child's real syllabus with
retrieval (RAG). Both live entirely in the backend; the client never changes.

## The safety contract this rests on

ParentProof's rule is already the thing that makes all of this safe:

> **The deterministic engine owns every number and claim. The LLM only writes
> questions and phrases prose — it never invents a metric.**

Three guardrails enforce it today, and they run **regardless of provider or
retrieval**:

- **Answer-key verification** (`generate.ts`) — a second, blind pass re-solves
  each question; anything it can't confirm is dropped.
- **Banned-words + no-invented-numbers** (`shared/card.ts` `checkCard`) — prose
  that names ability, shames a child, or introduces a number not in the input is
  rejected and falls back to the engine's own safe strings.
- **Structural validation** (`validateItems`) — 4 options, one correct, etc.

So swapping Claude for Gemini, or injecting retrieved context, can only change
*wording and coverage* — never the correctness or the numbers a parent sees. A
weaker/cheaper model is a quality dial, not a safety risk. That's the whole
reason multi-provider is low-risk here.

---

## Part 1 — Provider abstraction

Today `server/generate.ts` and `server/render.ts` import the Anthropic SDK
directly. Introduce a thin seam so the two call sites depend on an interface, not
a vendor.

```
server/llm/
  provider.ts     # the interface + shared types
  anthropic.ts    # Claude adapter (moves today's SDK calls here)
  gemini.ts       # Google Generative AI adapter
  router.ts       # picks a provider/model per task from env, with fallback
  mock.ts         # the deterministic no-key path, unchanged
```

```ts
// provider.ts
export interface LlmProvider {
  /** structured JSON out, validated against a JSON Schema (question authoring). */
  json<T>(req: { system: string; user: string; schema: object; effort?: Effort }): Promise<T>
  /** free-form text (prose rendering), still parsed defensively downstream. */
  text(req: { system: string; user: string; effort?: Effort }): Promise<string>
}
```

- Each task names a **capability**, not a model: `generate` (author + verify —
  needs the strongest reasoning), `render` (prose — a cheaper/faster model is
  fine). `router.ts` maps capability → provider+model from env
  (`LLM_PROVIDER`, `LLM_MODEL_GENERATE`, `LLM_MODEL_RENDER`) and can **fall back**
  to a secondary provider on error/timeout.
- Model IDs live in **env**, never hard-coded — swap or A/B without a deploy.
- Provider differences the adapters absorb: Anthropic uses
  `output_config.format: json_schema` + adaptive thinking; Gemini uses
  `responseMimeType: application/json` + `responseSchema` (and `thinkingConfig`
  on 2.5 models). The `json()`/`text()` contract hides both. `extractJson`/
  `textOf` (already in the codebase) become shared helpers.
- **No call-site rewrite of the guardrails**: `generateWithClaude` →
  `authorItems(provider, req)`, `verifyAnswers` stays but takes the provider —
  the verify pass can even run on a *different* provider than the author for
  independence (a nice property: Gemini authors, Claude verifies, or vice-versa).

Migration is mechanical and testable: move the Anthropic calls into
`anthropic.ts`, add `gemini.ts`, route by env. Mock mode is untouched, so every
existing test stays green.

## Part 2 — RAG (retrieval-augmented generation)

**Why:** questions and diagnoses should be grounded in the child's *actual*
board + class + chapter — the real NCERT/CBSE syllabus text, past board
questions, common-misconception banks — not the model's memory. Grounding raises
question fidelity and cuts hallucination *before* the guardrails even run.

**Store — Supabase `pgvector` (no new vendor, no new domain).** We're already on
Supabase Postgres; enable `pgvector` and keep retrieval first-party and
server-side.

```sql
create extension if not exists vector;
create table rag_chunks (
  id text primary key,
  board text, klass int, subject text, chapter text,   -- metadata filters
  source text, content text,
  embedding vector(768)                                 -- matches EMBEDDING_DIM
);
create index on rag_chunks using hnsw (embedding vector_cosine_ops);
```

This slots into the existing `Store` seam as a `PostgresStore` extension
(`upsertChunks`, `searchChunks`). SQLite local dev either skips RAG (mock) or
uses a trivial keyword fallback, so `npm run dev` stays zero-setup.

```
server/rag/
  embedder.ts     # EmbeddingProvider interface + Gemini/OpenAI/Voyage adapters
  ingest.ts       # chunk → embed → upsert (a script + optional admin endpoint)
  retrieve.ts     # embed query → metadata-filtered vector search → top-k chunks
```

**Pipeline:**

1. **Ingest** (offline): chunk syllabus/textbook/question-bank docs (~300–800
   tokens, overlap), embed via `EmbeddingProvider`, upsert into `rag_chunks` with
   `{board, klass, subject, chapter, source}`.
2. **Retrieve** (request time): build a query from the task
   (`board+klass+subject+chapter+targeted skill/misconception`), embed it,
   vector-search **filtered by that metadata**, take top-k.
3. **Generate**: pass retrieved chunks as grounding context in the `generate`
   system/user prompt. Then the **unchanged** verify + validate guardrails run.

**Embeddings** go behind their own small interface (mirrors the LLM one) so the
embedding model is swappable too — `EMBEDDING_PROVIDER` / `EMBEDDING_MODEL` /
`EMBEDDING_DIM`. Keep the ingestion embedder and the query embedder identical
(same model + dim) or the vectors don't compare.

**Where retrieval helps first:** question authoring (grounded, syllabus-exact
items). The prose renderer usually needs no retrieval — it's rewriting a finding
the engine already produced.

## Domain hygiene (ties into DEPLOYMENT.md)

All provider + embedding calls are **server-side** — the client resolves none of
`generativelanguage.googleapis.com`, `api.anthropic.com`, or `*.supabase.co`.
That's the strongest form of the first-party rule: for these vendors there's
nothing in the client to migrate, ever.

## Suggested build order

1. `server/llm/` seam + Anthropic adapter (behaviour-preserving refactor) — tests stay green.
2. Gemini adapter + env routing + optional cross-provider verify.
3. `pgvector` schema + embedder + ingest script (seed one chapter end-to-end).
4. Wire retrieval into `generate`; measure question fidelity vs. today.
