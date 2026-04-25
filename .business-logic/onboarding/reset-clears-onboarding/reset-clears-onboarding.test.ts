import { describe, it, expect, beforeEach } from "vitest";

// Executable spec for reset-clears-onboarding.
// Simulates demo reset endpoint and reco resetUser() behavior.

type DemoProfile = { id: string; onboardedAt: Date | null };
type Like = { userId: string; contentId: string };
type Bookmark = { userId: string; contentId: string };
type RecoProfile = { externalUserId: string };

class System {
  demoProfiles = new Map<string, DemoProfile>();
  demoLikes: Like[] = [];
  demoBookmarks: Bookmark[] = [];
  recoProfiles = new Map<string, RecoProfile>();

  // Instrumentation: record ordering of side-effects.
  operationLog: string[] = [];
  recoShouldFail = false;
}

// Demo reset endpoint — must match production behavior.
function demoResetEndpoint(sys: System, userId: string): { ok: boolean } {
  // RULE: demo-side clears FIRST.
  const p = sys.demoProfiles.get(userId);
  if (p) {
    p.onboardedAt = null;
    sys.operationLog.push("demo:onboarded_at=null");
  }
  sys.demoLikes = sys.demoLikes.filter((l) => l.userId !== userId);
  sys.operationLog.push("demo:likes-deleted");
  sys.demoBookmarks = sys.demoBookmarks.filter((b) => b.userId !== userId);
  sys.operationLog.push("demo:bookmarks-deleted");

  // Then call reco.
  try {
    recoResetUser(sys, userId);
    sys.operationLog.push("reco:profile-deleted");
  } catch (_e) {
    sys.operationLog.push("reco:delete-failed");
    // Per rule: do NOT revert demo-side clears.
  }

  return { ok: true };
}

function recoResetUser(sys: System, externalUserId: string): void {
  if (sys.recoShouldFail) {
    throw new Error("reco unavailable");
  }
  sys.recoProfiles.delete(externalUserId);
}

// Onboarding page redirect logic — shared with overwrite-semantics.
function onboardingPageRedirect(onboardedAt: Date | null): "render-form" | "redirect-feed" {
  return onboardedAt === null ? "render-form" : "redirect-feed";
}

describe("onboarding/reset-clears-onboarding", () => {
  let sys: System;

  beforeEach(() => {
    sys = new System();
    // Seed: user u1 is onboarded with likes, bookmarks, and a reco profile.
    sys.demoProfiles.set("u1", { id: "u1", onboardedAt: new Date(1000) });
    sys.demoLikes.push({ userId: "u1", contentId: "c1" });
    sys.demoBookmarks.push({ userId: "u1", contentId: "c2" });
    sys.recoProfiles.set("u1", { externalUserId: "u1" });
  });

  it("reset nulls onboarded_at", () => {
    demoResetEndpoint(sys, "u1");
    expect(sys.demoProfiles.get("u1")!.onboardedAt).toBeNull();
  });

  it("reset clears likes and bookmarks alongside onboarded_at", () => {
    demoResetEndpoint(sys, "u1");
    expect(sys.demoLikes.filter((l) => l.userId === "u1")).toHaveLength(0);
    expect(sys.demoBookmarks.filter((b) => b.userId === "u1")).toHaveLength(0);
  });

  it("reset calls reco resetUser (profile deleted)", () => {
    demoResetEndpoint(sys, "u1");
    expect(sys.recoProfiles.has("u1")).toBe(false);
  });

  it("ordering: demo-side clears happen BEFORE reco DELETE", () => {
    demoResetEndpoint(sys, "u1");
    const onboardedIdx = sys.operationLog.indexOf("demo:onboarded_at=null");
    const likesIdx = sys.operationLog.indexOf("demo:likes-deleted");
    const bookmarksIdx = sys.operationLog.indexOf("demo:bookmarks-deleted");
    const recoIdx = sys.operationLog.indexOf("reco:profile-deleted");
    expect(onboardedIdx).toBeGreaterThanOrEqual(0);
    expect(onboardedIdx).toBeLessThan(recoIdx);
    expect(likesIdx).toBeLessThan(recoIdx);
    expect(bookmarksIdx).toBeLessThan(recoIdx);
  });

  it("reco failure does NOT revert the demo-side clear (demo stays clean)", () => {
    sys.recoShouldFail = true;
    demoResetEndpoint(sys, "u1");
    // Demo was cleaned regardless of reco outcome.
    expect(sys.demoProfiles.get("u1")!.onboardedAt).toBeNull();
    expect(sys.demoLikes.filter((l) => l.userId === "u1")).toHaveLength(0);
    // Reco state is whatever reco managed (here: still present because it failed).
    expect(sys.operationLog).toContain("reco:delete-failed");
  });

  it("post-reset /onboarding renders form (no stale onboarded_at redirect)", () => {
    demoResetEndpoint(sys, "u1");
    const decision = onboardingPageRedirect(sys.demoProfiles.get("u1")!.onboardedAt);
    expect(decision).toBe("render-form");
  });

  it("regression guard: if reset forgets onboarded_at, /onboarding wrongly redirects", () => {
    // Counterfactual simulation — what happens if a refactor removes the
    // onboarded_at clear. This test encodes the WHY, not the HOW.
    const buggyReset = () => {
      sys.demoLikes = sys.demoLikes.filter((l) => l.userId !== "u1");
      sys.demoBookmarks = sys.demoBookmarks.filter((b) => b.userId !== "u1");
      recoResetUser(sys, "u1");
      // onboarded_at intentionally NOT cleared — regression.
    };
    buggyReset();
    const decision = onboardingPageRedirect(sys.demoProfiles.get("u1")!.onboardedAt);
    expect(decision).toBe("redirect-feed"); // Bug: onboarding silently bypassed.
    // In production, `demoResetEndpoint` MUST avoid this failure mode.
    // The passing test above (post-reset renders form) is the one that must hold.
  });
});
