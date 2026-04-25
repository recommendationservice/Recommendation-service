# Ownership-split — demo owns onboarded_at, reco owns preference_vector

**Severity: HARD RULE**

Onboarding state splits across two bounded contexts. Neither side duplicates the other's state.

| Concern | Owner | Storage | Semantic |
|---|---|---|---|
| "Did user see and close the onboarding page?" | demo | `demo.profiles.onboarded_at timestamptz null` | UI flow control. |
| "Does user have an LLM-derived preference vector?" | reco | `reco.user_profiles.preference_vector vector(1536) null` | Recommendation quality signal. |
| "LLM-onboarded vs skipped cohort" | derived | not stored; computed by join at analysis time | Defence metric classification. |

## Why

This split is the fine-grained form of `/.claude/docs/business-rules/service-boundaries.md`:

- Reco is pure recommendation logic. "User saw the UI" has no meaning to reco.
- Demo is UI flow control. Embedding dimensions have no place in demo schema.
- Cohort classification is a DERIVED property. Storing it in either table denormalizes and couples the services.

## Cross-repo sequence (onboarding)

```mermaid
sequenceDiagram
    participant Browser
    participant DemoUI as demo.app /onboarding
    participant DemoAPI as demo.api /api/demo/onboarding
    participant DemoDB as demo.profiles
    participant Sdk as reco-sdk
    participant RecoAPI as reco.api /users/:id/bootstrap
    participant Gemini
    participant Embed as OpenRouter embeddings
    participant RecoDB as reco.user_profiles

    Browser->>DemoUI: GET /onboarding
    DemoUI->>DemoDB: SELECT onboarded_at WHERE profile_id=$1
    alt onboarded_at IS NOT NULL
      DemoUI-->>Browser: redirect /feed
    else null
      DemoUI-->>Browser: render form
      Browser->>DemoAPI: POST /api/demo/onboarding { rawPrompt | null }
      alt rawPrompt provided (LLM path)
        DemoAPI->>Sdk: bootstrapUser({externalUserId, rawPrompt})
        Sdk->>RecoAPI: POST /users/:id/bootstrap { rawPrompt }
        RecoAPI->>Gemini: enrich(rawPrompt) → JSON{genres, themes, moods, sample_titles}
        RecoAPI->>RecoAPI: synthesize canonical text
        RecoAPI->>Embed: embed(canonicalText) → 1536-d vector
        RecoAPI->>RecoDB: upsert user_profiles SET preference_vector=$v
        RecoAPI-->>Sdk: 200 { preferenceVectorSet:true, enrichedText }
        Sdk-->>DemoAPI: BootstrapResult
        DemoAPI->>DemoDB: UPDATE profiles SET onboarded_at=now()
        DemoAPI-->>Browser: 200 { ok:true, enrichedText }
      else rawPrompt:null (skip path)
        DemoAPI->>DemoDB: UPDATE profiles SET onboarded_at=now()
        DemoAPI-->>Browser: 200 { ok:true }
        Note over RecoDB: user_profiles NOT created now; lazy on first event
      end
    end
```

`onboarded_at` is written AFTER the reco call succeeds (LLM path) or WITHOUT any reco call (skip path). If the reco call fails, `onboarded_at` stays null and the user retries cleanly — the cohort-integrity rule in motion.

## How to apply

- Demo schema: `onboardedAt: timestamp("onboarded_at", { withTimezone: true })` nullable on `demo.profiles`. DrizzleKit migration.
- Demo onboarding endpoint: orchestrates — on LLM path, call `recoClient.bootstrapUser()` first, then write `onboarded_at` on success; on skip, just write `onboarded_at`.
- Reco schema: MUST NOT add `onboarded_at` column.
- Cohort classification (analysis time): join `demo.profiles` ⟕ `reco.user_profiles` on `profile.id = user_profiles.external_user_id`.
  - `llm-onboarded` if `onboarded_at IS NOT NULL AND preference_vector IS NOT NULL`
  - `skipped` if `onboarded_at IS NOT NULL AND preference_vector IS NULL`
  - `in-flight` if `onboarded_at IS NULL` (never finished or failed mid-way)

## Tests

`ownership-split.test.ts` — asserts (a) the classifier table is complete and consistent, (b) demo-side write happens only AFTER reco success in the LLM path, (c) skip path touches zero reco state.
