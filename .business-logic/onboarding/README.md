# Onboarding (LLM cold-start bootstrap)

Domain: new user → onboarding page → (LLM path | skip) → ready for feed.

Scope: `apps/demo/` UI + `apps/recommendation-service/` bootstrap endpoint + demo-local `onboarded_at` flag. Cross-repo; contract lives in `packages/reco-sdk/`.

## Rules in this folder

| Rule | What it enforces |
|---|---|
| `cohort-integrity/` | Gemini/embedding failure → 503; no silent fallback; two clean end-states only (LLM-onboarded or skipped). |
| `skip-semantics/` | Skip triggers zero reco calls; `user_profiles` is created lazily on first event. |
| `overwrite-semantics/` | Bootstrap always overwrites `preference_vector`; UI is the guard against re-onboarding. |
| `reset-clears-onboarding/` | Reset-demo clears `onboarded_at` atomically with likes/bookmarks/reco-profile wipe. |
| `ownership-split/` | Demo owns `onboarded_at`; reco owns `preference_vector`; cohort class is derived at analysis time. |

## Cross-repo parent rule

- `/.claude/docs/business-rules/service-boundaries.md` — reco is independent of demo. All rules here inherit that constraint.
