import { describe, it, expect, beforeEach } from "vitest";

// Executable spec for ownership-split.
// Pins the cohort-classification table and the ordering of the
// demo.onboarded_at write relative to reco.preference_vector write.

type Cohort = "llm-onboarded" | "skipped" | "in-flight";

// Pure classifier — the derivation rule at analysis time. No DB.
function classify(
  onboardedAt: Date | null,
  preferenceVector: number[] | null,
): Cohort {
  if (onboardedAt === null) return "in-flight";
  if (preferenceVector === null) return "skipped";
  return "llm-onboarded";
}

// --- Orchestration model: demo endpoint, LLM path with atomicity ---

type DemoProfile = { id: string; onboardedAt: Date | null };
type RecoProfile = { externalUserId: string; preferenceVector: number[] | null };

class System {
  demo = new Map<string, DemoProfile>();
  reco = new Map<string, RecoProfile>();
  log: string[] = [];
  recoShouldFail = false;
}

function recoBootstrap(sys: System, externalUserId: string, vector: number[]): void {
  if (sys.recoShouldFail) {
    sys.log.push("reco:failed");
    throw new Error("upstream error");
  }
  const p = sys.reco.get(externalUserId) ?? { externalUserId, preferenceVector: null };
  p.preferenceVector = vector;
  sys.reco.set(externalUserId, p);
  sys.log.push("reco:vector-written");
}

function demoOnboardingEndpoint(
  sys: System,
  userId: string,
  body: { rawPrompt: string | null },
): { ok: boolean; httpStatus: number } {
  if (!sys.demo.has(userId)) {
    sys.demo.set(userId, { id: userId, onboardedAt: null });
  }
  if (body.rawPrompt === null) {
    // Skip: only demo write, no reco call.
    sys.demo.get(userId)!.onboardedAt = new Date();
    sys.log.push("demo:onboarded_at=set");
    return { ok: true, httpStatus: 200 };
  }
  // LLM: reco call FIRST, then demo write on success.
  try {
    recoBootstrap(sys, userId, [0.1, 0.2, 0.3]);
  } catch {
    return { ok: false, httpStatus: 503 };
  }
  sys.demo.get(userId)!.onboardedAt = new Date();
  sys.log.push("demo:onboarded_at=set");
  return { ok: true, httpStatus: 200 };
}

describe("onboarding/ownership-split — cohort classifier", () => {
  it("onboarded_at set + vector set → llm-onboarded", () => {
    expect(classify(new Date(), [0.1, 0.2])).toBe("llm-onboarded");
  });

  it("onboarded_at set + vector null → skipped", () => {
    expect(classify(new Date(), null)).toBe("skipped");
  });

  it("onboarded_at null + vector null → in-flight", () => {
    expect(classify(null, null)).toBe("in-flight");
  });

  it("onboarded_at null + vector set → in-flight (invariant: this state is never reached in production)", () => {
    // Per the atomicity rule (cohort-integrity), demo writes onboarded_at
    // ONLY after reco returns success. So "vector set but onboarded_at null"
    // is a transient mid-request state, never a committed one. The
    // classifier defensively treats it as in-flight (user hasn't completed
    // onboarding from demo's perspective yet).
    expect(classify(null, [0.1])).toBe("in-flight");
  });

  it("classification is exhaustive (no 4th cohort)", () => {
    const cohorts = new Set<Cohort>();
    for (const o of [null, new Date()]) {
      for (const v of [null, [0.1]]) {
        cohorts.add(classify(o, v));
      }
    }
    expect(cohorts.size).toBeLessThanOrEqual(3);
    expect([...cohorts].every((c) => ["llm-onboarded", "skipped", "in-flight"].includes(c))).toBe(true);
  });
});

describe("onboarding/ownership-split — write ordering", () => {
  let sys: System;
  beforeEach(() => {
    sys = new System();
  });

  it("LLM path: reco vector is written BEFORE demo.onboarded_at", () => {
    demoOnboardingEndpoint(sys, "u1", { rawPrompt: "thrillers" });
    const recoIdx = sys.log.indexOf("reco:vector-written");
    const demoIdx = sys.log.indexOf("demo:onboarded_at=set");
    expect(recoIdx).toBeGreaterThanOrEqual(0);
    expect(demoIdx).toBeGreaterThanOrEqual(0);
    expect(recoIdx).toBeLessThan(demoIdx);
  });

  it("LLM failure: reco fails → demo.onboarded_at is NOT written (user can retry)", () => {
    sys.recoShouldFail = true;
    const r = demoOnboardingEndpoint(sys, "u1", { rawPrompt: "thrillers" });
    expect(r.httpStatus).toBe(503);
    expect(sys.demo.get("u1")!.onboardedAt).toBeNull();
    expect(sys.log).toContain("reco:failed");
    expect(sys.log).not.toContain("demo:onboarded_at=set");
  });

  it("skip path: touches zero reco state", () => {
    demoOnboardingEndpoint(sys, "u1", { rawPrompt: null });
    expect(sys.reco.has("u1")).toBe(false);
    expect(sys.log).not.toContain("reco:vector-written");
    expect(sys.log).toContain("demo:onboarded_at=set");
  });

  it("post-success cohort classification is 'llm-onboarded'", () => {
    demoOnboardingEndpoint(sys, "u1", { rawPrompt: "thrillers" });
    const demoProfile = sys.demo.get("u1")!;
    const recoProfile = sys.reco.get("u1")!;
    expect(classify(demoProfile.onboardedAt, recoProfile.preferenceVector)).toBe("llm-onboarded");
  });

  it("post-skip cohort classification is 'skipped'", () => {
    demoOnboardingEndpoint(sys, "u1", { rawPrompt: null });
    const demoProfile = sys.demo.get("u1")!;
    const recoProfile = sys.reco.get("u1");
    expect(classify(demoProfile.onboardedAt, recoProfile?.preferenceVector ?? null)).toBe("skipped");
  });

  it("post-failure cohort classification is 'in-flight' (retry still possible)", () => {
    sys.recoShouldFail = true;
    demoOnboardingEndpoint(sys, "u1", { rawPrompt: "thrillers" });
    const demoProfile = sys.demo.get("u1")!;
    const recoProfile = sys.reco.get("u1");
    expect(classify(demoProfile.onboardedAt, recoProfile?.preferenceVector ?? null)).toBe("in-flight");
  });
});
