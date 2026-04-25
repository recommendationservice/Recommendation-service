import { describe, it, expect, beforeEach } from "vitest";

// Executable spec for overwrite-semantics.
// Simulates reco bootstrap + demo UI guard behavior.

type RecoProfile = {
  externalUserId: string;
  preferenceVector: number[] | null;
  events: number;
  updatedAt: Date;
};

class RecoDb {
  profiles = new Map<string, RecoProfile>();
  upsert(externalUserId: string): RecoProfile {
    let p = this.profiles.get(externalUserId);
    if (!p) {
      p = {
        externalUserId,
        preferenceVector: null,
        events: 0,
        updatedAt: new Date(0),
      };
      this.profiles.set(externalUserId, p);
    }
    return p;
  }
}

// The bootstrap service as it MUST behave.
type BootstrapResult = { preferenceVectorSet: boolean; status: number };
function recoBootstrap(
  db: RecoDb,
  externalUserId: string,
  rawPrompt: string | undefined,
  // Fake enrichment + embedding — deterministic for test purposes.
  fakeVector: number[] = [0.1, 0.2, 0.3],
): BootstrapResult {
  const profile = db.upsert(externalUserId);
  if (rawPrompt === undefined) {
    return { preferenceVectorSet: false, status: 200 };
  }
  // Hard rule: unconditional overwrite. No existence check, no 409, no
  // event-count check.
  profile.preferenceVector = fakeVector;
  profile.updatedAt = new Date();
  return { preferenceVectorSet: true, status: 200 };
}

// Demo onboarding page redirect logic.
function onboardingPageRedirect(onboardedAt: Date | null): "render-form" | "redirect-feed" {
  return onboardedAt === null ? "render-form" : "redirect-feed";
}

describe("onboarding/overwrite-semantics", () => {
  let db: RecoDb;
  beforeEach(() => {
    db = new RecoDb();
  });

  it("writes when preference_vector is null (fresh user)", () => {
    const r = recoBootstrap(db, "u1", "dark thrillers", [1, 2, 3]);
    expect(r.preferenceVectorSet).toBe(true);
    expect(r.status).toBe(200);
    expect(db.profiles.get("u1")!.preferenceVector).toEqual([1, 2, 3]);
  });

  it("overwrites when preference_vector already set", () => {
    // Simulate a prior onboarding.
    const existing = db.upsert("u1");
    existing.preferenceVector = [9, 9, 9];
    existing.updatedAt = new Date(1000);

    const r = recoBootstrap(db, "u1", "new taste", [4, 5, 6]);
    expect(r.preferenceVectorSet).toBe(true);
    expect(db.profiles.get("u1")!.preferenceVector).toEqual([4, 5, 6]);
  });

  it("never returns 409 on overwrite", () => {
    const existing = db.upsert("u1");
    existing.preferenceVector = [9, 9, 9];
    const r = recoBootstrap(db, "u1", "new taste");
    expect(r.status).not.toBe(409);
    expect(r.status).toBe(200);
  });

  it("does not check event count before overwriting", () => {
    const existing = db.upsert("u1");
    existing.preferenceVector = [9, 9, 9];
    existing.events = 500;
    const r = recoBootstrap(db, "u1", "new taste", [7, 8, 9]);
    expect(r.preferenceVectorSet).toBe(true);
    expect(db.profiles.get("u1")!.preferenceVector).toEqual([7, 8, 9]);
  });

  it("preserves event history on overwrite (events not reset)", () => {
    const existing = db.upsert("u1");
    existing.preferenceVector = [9, 9, 9];
    existing.events = 42;
    recoBootstrap(db, "u1", "new taste");
    expect(db.profiles.get("u1")!.events).toBe(42);
  });

  it("UI guard: onboarded_at non-null → redirect to /feed, form never renders", () => {
    expect(onboardingPageRedirect(new Date())).toBe("redirect-feed");
  });

  it("UI guard: onboarded_at null → form renders (first-time user)", () => {
    expect(onboardingPageRedirect(null)).toBe("render-form");
  });

  it("documented risk: removing UI guard exposes data-loss path (this test pins current behavior)", () => {
    // If the UI guard is removed in a future refactor, `onboardingPageRedirect`
    // would return "render-form" for already-onboarded users, enabling the
    // overwrite on re-submit. This test encodes the current pairing: the
    // server does no check, so the UI MUST.
    const alreadyOnboarded = new Date();
    const decision = onboardingPageRedirect(alreadyOnboarded);
    expect(decision).toBe("redirect-feed");
    // If this assertion ever changes, re-read the rule README — the
    // accepted-risk section is no longer accurate.
  });

  it("ensure-profile mode (rawPrompt undefined) does not write a vector", () => {
    const r = recoBootstrap(db, "u1", undefined);
    expect(r.preferenceVectorSet).toBe(false);
    expect(db.profiles.get("u1")!.preferenceVector).toBeNull();
  });
});
