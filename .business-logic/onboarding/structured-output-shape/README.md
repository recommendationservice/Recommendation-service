# Structured-output-shape — LLM bootstrap response carries enrichment

**Severity: HARD RULE**

When the LLM bootstrap path runs to completion (`preferenceVectorSet === true` AND a non-null preference vector was just persisted), the bootstrap response MUST include an `enrichment` object with these guarantees:

- `enrichment.paragraph` — non-empty Ukrainian sentence(s) addressing the user with informal "ти". This is the human-readable summary the UI shows above the badges on the post-onboarding screen.
- `enrichment.genres` — non-empty array of strings drawn from the 18-item controlled vocabulary: `action, adventure, animation, comedy, crime, documentary, drama, family, fantasy, history, horror, music, mystery, romance, science fiction, thriller, war, western`. Used as badge labels in the UI.
- `enrichment.similarTitles` — array of strings; MAY be empty if the model could not produce confident similar titles.

Skip path (`rawPrompt: null` / `undefined`) and the dedup short-circuit are EXEMPT — `enrichment` is omitted entirely on those paths. The invariant binds only when the LLM actually ran and the vector was just written.

## Why

Three legitimate scenarios where the UI consumes `enrichment`:

1. Fresh user submits onboarding prompt → LLM runs → UI shows paragraph + badges immediately, before redirect to `/feed`.
2. After reset-demo and re-onboarding → same.
3. URL-manipulation re-bootstrap → same (overwrite-semantics still applies; UI guard is upstream).

Three reasons the contract must be enforced server-side, not "best-effort":

- **User-visible blank state.** Empty paragraph → user sees a white card after submit, the most fragile onboarding moment. Empty genres → no badges, the visual feedback that justified Rework 2 disappears.
- **Cross-repo contract.** `packages/reco-sdk/` is the type the demo `/onboarding` page imports. Without min-length on `paragraph`/`genres`, TS happily accepts garbage and the UI bug surfaces in production.
- **Two valid implementations existed.** (a) LLM returns all three fields, server passes through. (b) LLM returns `localized_summary` only and we recompute genres separately for the UI. We chose (a); (b) was discarded as expensive and slow.

## Known risk

If the Gemini structured-output schema ever drifts (model version change, prompt rewrite) and starts returning `localized_summary: ""` or `genres: []`, the bootstrap call fails Zod validation at the reco service boundary and surfaces as 503. That is intentional — failed enrichment is a cohort-integrity issue (see `../cohort-integrity/`), not a silent fallback.

## How to apply

- `apps/recommendation-service/src/services/gemini.ts`: Gemini structured-output schema requires `localized_summary: string` and `genres: array<enum>` with non-empty constraints; `similar_titles` is optional array.
- `apps/recommendation-service/src/services/bootstrap.ts`: when LLM path runs, build `enrichment = { paragraph, genres, similarTitles }` from the Gemini response and include it in the return value alongside `preferenceVectorSet: true`. Skip path returns `{ preferenceVectorSet: false }`. Dedup short-circuit returns `{ preferenceVectorSet: true }` without `enrichment`.
- `apps/recommendation-service/src/lib/schemas.ts`: `bootstrapResponse` Zod schema enforces `paragraph: z.string().min(1)`, `genres: z.array(z.string()).min(1)`, `similarTitles: z.array(z.string())`. Schema is the single source of truth for the SDK contract.
- `packages/reco-sdk/src/types.ts`: `BootstrapResponse` is inferred from the same Zod schema (or kept structurally identical).
- `apps/demo/src/features/onboarding/`: post-submit screen reads `enrichment.paragraph` + `enrichment.genres` and renders badges. Treats absence of `enrichment` as the skip case.

## Tests

`structured-output-shape.test.ts` — asserts:

1. Happy LLM path produces full `enrichment` with non-empty paragraph and non-empty genres array.
2. Bootstrap response round-trips through `bootstrapResponse.parse(...)` without error.
3. Skip path (`rawPrompt: undefined`) returns `{ preferenceVectorSet: false }` and omits `enrichment`.
4. Dedup short-circuit (recent `updatedAt` < 5s + existing vector) returns `{ preferenceVectorSet: true }` without `enrichment` and is allowed.
5. Negative: hand-crafted response with empty `paragraph` MUST fail `bootstrapResponse.parse(...)`.
6. Negative: hand-crafted response with empty `genres` array MUST fail `bootstrapResponse.parse(...)`.
