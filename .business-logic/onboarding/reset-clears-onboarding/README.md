# Reset-clears-onboarding — atomicity

**Severity: HARD RULE**

When user executes "reset demo", the demo reset endpoint (`apps/demo/src/app/(api)/api/demo/reset/route.ts`) MUST clear `profiles.onboarded_at = NULL` in the same request as clearing `likes`, `bookmarks`, and calling reco's `resetUser()`.

If `onboarded_at` is not cleared, the user hits `/onboarding` post-reset, the page sees stale `onboarded_at`, and immediately redirects to `/feed` — with no reco profile and a random cold-start. Onboarding is silently bypassed on the next demo cycle.

## Ordering (demo-first)

```
demo.profiles.onboarded_at = NULL
demo.likes DELETE
demo.bookmarks DELETE
→ reco DELETE /users/:externalUserId
```

Demo-side clears go first so that a reco-side failure leaves the demo in a "ready for onboarding again" state. The reverse (reco cleared, demo retains stale `onboarded_at`) is worse — silent bypass.

## Cross-repo sequence

See `../ownership-split/README.md` for the demo↔reco sequence diagram including the reset path.

## How to apply

- Reset route: one `UPDATE profiles SET onboarded_at = NULL WHERE id = $1` alongside the existing `DELETE FROM likes` and `DELETE FROM bookmarks`.
- Wrap demo-side statements in a Drizzle transaction if not already.
- If reco's `resetUser()` fails after demo clears succeed, do not roll back demo — leave it clean.
- Test: onboard → reset-demo → visit `/feed` → assert redirect to `/onboarding`.

## Tests

`reset-clears-onboarding.test.ts` — asserts (a) reset nulls `onboarded_at`, (b) ordering demo-first then reco, (c) reco failure does not revert the demo clear, (d) post-reset `/onboarding` renders form (no stale redirect).
