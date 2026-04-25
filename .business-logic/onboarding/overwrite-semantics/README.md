# Overwrite-semantics — bootstrap always overwrites

**Severity: HARD RULE**

Reco bootstrap endpoint (`POST /users/:externalUserId/bootstrap` with `rawPrompt`) ALWAYS overwrites `user_profiles.preference_vector`. It does NOT:

- check whether a vector already exists;
- blend new vector with the existing one;
- refuse based on event history;
- return 409 Conflict.

The UI layer in demo is the sole guard against accidental re-onboarding via the `profiles.onboarded_at` check. If `onboarded_at` is non-null, `/onboarding` redirects to `/feed` before the form renders.

## Why

Three legitimate bootstrap scenarios:

1. Fresh registration — no vector, no events. Write. ✔
2. After reset-demo — profile was deleted entirely. Write. ✔
3. URL-manipulation edge case — vector is overwritten, events remain but do not contribute to the new vector.

A server-side "refuse overwrite" guard would require a DB read on every bootstrap, fail to cover scenario 2, and add no safety the UI `onboarded_at` check does not already provide.

## Known risk

If the `onboarded_at` UI guard is ever removed (e.g. adding a "re-onboard" flow), re-submitting onboarding silently wipes an established user's accumulated preference vector. Event history is kept in `events` but is not re-projected. Accepted for MVP; revisit if re-onboarding UX is added.

## How to apply

- `services/bootstrap.ts`: unconditional `UPDATE user_profiles SET preference_vector = $1, updated_at = now() WHERE external_user_id = $2` inside the transaction that also upserts the profile row.
- `/onboarding` page: read `onboarded_at` server-side before render; redirect to `/feed` if set.
- Reset MUST clear `onboarded_at` (see `../reset-clears-onboarding/`).

## Tests

`overwrite-semantics.test.ts` — asserts (a) bootstrap with existing vector replaces it, (b) no 409 path, (c) no event-count check, (d) UI guard rejects re-onboarding pre-submit.
