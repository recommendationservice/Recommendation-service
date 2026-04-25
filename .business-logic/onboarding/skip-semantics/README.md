# Skip-semantics — skip means zero reco calls

**Severity: HARD RULE**

When user presses skip on `/onboarding`:

1. Demo MUST NOT call the reco bootstrap endpoint.
2. Demo MUST write `profiles.onboarded_at = now()` locally.
3. Demo MUST redirect to `/feed`.

Reco's `user_profiles` row is NOT created eagerly. It is created lazily on the first user event via `findOrCreateProfile()` in `apps/recommendation-service/src/services/events.ts:73-93`.

## Why

Skip is the ONLY path that exercises the pure cold-start baseline (`ORDER BY RANDOM()` in `recommendations.ts:152`) for comparison against the LLM-onboarded cohort. There is no UI toggle between "baseline" and "LLM-cold-start" — skipping the onboarding page IS the baseline.

Eager profile creation on skip would add analytics noise (`totalEvents=0` rows with no meaning), introduce a race window with `findOrCreateProfile()`, and diverge from the established lazy-upsert pattern.

## How to apply

- Demo skip handler → `POST /api/demo/onboarding` with `{ rawPrompt: null }`.
- Demo endpoint: if `rawPrompt === null` → only write `onboarded_at`; do NOT call `recoClient.bootstrapUser()`.
- Reco bootstrap's "ensure-profile" code path (body `{}` with no `rawPrompt`) exists for future SDK consumers, but demo's skip UX does NOT use it.
- Feed cold-start path (`preferenceVector IS NULL OR events < 5` in `recommendations.ts:68`) fires automatically for skipped users — no change required.

## Tests

`skip-semantics.test.ts` — asserts (a) skip records exactly zero reco client invocations, (b) skip writes `onboarded_at`, (c) no reco profile exists post-skip, (d) first event triggers lazy creation.
