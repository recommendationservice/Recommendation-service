# Cohort integrity — no silent fallback

**Severity: HARD RULE**

If Gemini enrichment or embedding fails during onboarding submit, bootstrap MUST hard-fail with a retryable error (HTTP 503). No silent fallback to raw-prompt embedding, no null-vector write pretending to be skip, no partial writes.

## Two valid end-states only

1. **LLM-onboarded** — Gemini + embedding both succeeded; `preference_vector` non-null; `onboarded_at` set.
2. **Skipped** — user explicitly pressed skip; `preference_vector` null; `onboarded_at` set; no reco call made.

A third "soft-failed onboarding" state does not exist.

## Why

Defence metric (`task.md:19-20`, ColdLLM arXiv 2402.09176) is evaluated on the LLM-onboarded cohort. Silent fallbacks contaminate that cohort and make cold-start Recall@10 vs baseline comparison meaningless.

## How to apply

- Bootstrap endpoint (`POST /users/:externalUserId/bootstrap`): Gemini 4xx/5xx, JSON parse error after retry, embedding failure, timeout — all → 503 with `{ "error": { "message": "..." } }`. Never swallow.
- Atomicity: either (a) both enrichment + embedding + vector write succeed, or (b) none happen. Profile row may be upserted independently (idempotent `findOrCreateProfile`).
- Gemini hard timeout: 10s `AbortSignal`.
- Demo on 503: show retry message; do NOT auto-redirect to `/feed`; do NOT set `onboarded_at`.
- If user explicitly skips after 503 → that is the Skipped end-state, clean.

## Tests

`cohort-integrity.test.ts` — self-contained simulator of the bootstrap decision tree; asserts each failure mode produces the correct end-state and HTTP code.
