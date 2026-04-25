import { describe, it, expect, beforeEach } from "vitest";

// Executable spec for skip-semantics.
// Self-contained simulator of demo's onboarding endpoint.
// Production `POST /api/demo/onboarding` handler must exhibit identical
// call-counting and state-setting behavior.

type DemoProfile = { id: string; onboardedAt: Date | null };
type RecoProfile = { externalUserId: string; preferenceVector: number[] | null; events: number };

class Fakes {
  demo = new Map<string, DemoProfile>();
  reco = new Map<string, RecoProfile>();
  recoBootstrapCalls = 0;

  ensureDemoProfile(id: string) {
    if (!this.demo.has(id)) this.demo.set(id, { id, onboardedAt: null });
  }

  setOnboardedNow(id: string) {
    const p = this.demo.get(id)!;
    p.onboardedAt = new Date();
  }

  recoBootstrap(_externalUserId: string, _rawPrompt?: string | null) {
    this.recoBootstrapCalls++;
  }

  // Lazy upsert mirrored from events.ts:73 — called by event handler, not
  // onboarding. Guarantees profile exists before event is appended.
  findOrCreateRecoProfile(externalUserId: string): RecoProfile {
    let p = this.reco.get(externalUserId);
    if (!p) {
      p = { externalUserId, preferenceVector: null, events: 0 };
      this.reco.set(externalUserId, p);
    }
    return p;
  }
}

// The demo onboarding endpoint, modelled exactly as it must behave.
function demoOnboardingEndpoint(
  f: Fakes,
  userId: string,
  body: { rawPrompt: string | null },
) {
  f.ensureDemoProfile(userId);
  if (body.rawPrompt === null) {
    // Skip path — this rule's subject.
    f.setOnboardedNow(userId);
    return { ok: true };
  }
  // LLM path — not this rule's concern; exercised by cohort-integrity tests.
  f.recoBootstrap(userId, body.rawPrompt);
  f.setOnboardedNow(userId);
  return { ok: true, enrichedText: "synthesized" };
}

// The event endpoint (from events.ts) — lazy profile creation is its job.
function recordEvent(f: Fakes, userId: string) {
  const p = f.findOrCreateRecoProfile(userId);
  p.events++;
}

// Cold-start decision mirror from recommendations.ts:68.
function strategyFor(p: RecoProfile | undefined, WARM = 5): "cold_start" | "personalized" {
  if (!p) return "cold_start";
  if (p.preferenceVector === null) return "cold_start";
  if (p.events < WARM) return "cold_start";
  return "personalized";
}

describe("onboarding/skip-semantics", () => {
  let f: Fakes;
  beforeEach(() => {
    f = new Fakes();
  });

  it("skip results in zero reco bootstrap calls", () => {
    demoOnboardingEndpoint(f, "u1", { rawPrompt: null });
    expect(f.recoBootstrapCalls).toBe(0);
  });

  it("skip sets onboarded_at on demo profile", () => {
    demoOnboardingEndpoint(f, "u1", { rawPrompt: null });
    expect(f.demo.get("u1")!.onboardedAt).toBeInstanceOf(Date);
  });

  it("skip does not create a reco user_profiles row", () => {
    demoOnboardingEndpoint(f, "u1", { rawPrompt: null });
    expect(f.reco.has("u1")).toBe(false);
  });

  it("first event after skip triggers lazy profile creation", () => {
    demoOnboardingEndpoint(f, "u1", { rawPrompt: null });
    expect(f.reco.has("u1")).toBe(false);
    recordEvent(f, "u1");
    expect(f.reco.has("u1")).toBe(true);
    expect(f.reco.get("u1")!.events).toBe(1);
  });

  it("skipped user gets cold_start strategy (vector null)", () => {
    demoOnboardingEndpoint(f, "u1", { rawPrompt: null });
    // Cold-start before any event.
    expect(strategyFor(f.reco.get("u1"))).toBe("cold_start");
    // After a few events, still cold_start (<5 and vector null).
    recordEvent(f, "u1");
    recordEvent(f, "u1");
    expect(strategyFor(f.reco.get("u1"))).toBe("cold_start");
  });

  it("contrast: LLM path DOES call reco bootstrap (single invocation)", () => {
    demoOnboardingEndpoint(f, "u1", { rawPrompt: "dark thrillers" });
    expect(f.recoBootstrapCalls).toBe(1);
  });

  it("contrast: double-submit skip does not multiply reco calls (stays at 0)", () => {
    demoOnboardingEndpoint(f, "u1", { rawPrompt: null });
    demoOnboardingEndpoint(f, "u1", { rawPrompt: null });
    expect(f.recoBootstrapCalls).toBe(0);
  });
});
