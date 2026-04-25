import { describe, it, expect } from "vitest";

// Executable spec for the cohort-integrity rule.
// Self-contained — models the onboarding decision tree as a pure function
// and pins the outcome for every failure mode. Production code that backs
// POST /users/:id/bootstrap and POST /api/demo/onboarding must behave
// identically. If these tests fail, production code contaminates the cohort.

type Outcome =
  | { kind: "llm-onboarded"; vector: number[]; onboardedAt: true; httpStatus: 200 }
  | { kind: "skipped"; vector: null; onboardedAt: true; httpStatus: 200 }
  | { kind: "failure"; vector: null; onboardedAt: false; httpStatus: 503 };

type Inputs = {
  path: "llm" | "skip";
  gemini: "ok" | "fail" | "timeout";
  embedding: "ok" | "fail";
};

// Decision tree the production pipeline must implement.
function bootstrap(i: Inputs): Outcome {
  if (i.path === "skip") {
    return { kind: "skipped", vector: null, onboardedAt: true, httpStatus: 200 };
  }
  if (i.gemini !== "ok") {
    return { kind: "failure", vector: null, onboardedAt: false, httpStatus: 503 };
  }
  if (i.embedding !== "ok") {
    return { kind: "failure", vector: null, onboardedAt: false, httpStatus: 503 };
  }
  return { kind: "llm-onboarded", vector: [0.1, 0.2, 0.3], onboardedAt: true, httpStatus: 200 };
}

describe("onboarding/cohort-integrity", () => {
  it("LLM path, all ok → llm-onboarded with vector and onboarded_at", () => {
    const r = bootstrap({ path: "llm", gemini: "ok", embedding: "ok" });
    expect(r.kind).toBe("llm-onboarded");
    expect(r.vector).not.toBeNull();
    expect(r.onboardedAt).toBe(true);
    expect(r.httpStatus).toBe(200);
  });

  it("skip path → onboarded_at set, no vector, no reco failure", () => {
    const r = bootstrap({ path: "skip", gemini: "ok", embedding: "ok" });
    expect(r.kind).toBe("skipped");
    expect(r.vector).toBeNull();
    expect(r.onboardedAt).toBe(true);
  });

  describe("failure modes (must all collapse to the same clean 'failure' end-state)", () => {
    const failures: Inputs[] = [
      { path: "llm", gemini: "fail", embedding: "ok" },
      { path: "llm", gemini: "timeout", embedding: "ok" },
      { path: "llm", gemini: "ok", embedding: "fail" },
      { path: "llm", gemini: "fail", embedding: "fail" },
      { path: "llm", gemini: "timeout", embedding: "fail" },
    ];

    failures.forEach((scenario) => {
      it(`gemini=${scenario.gemini}, embedding=${scenario.embedding} → 503, no writes`, () => {
        const r = bootstrap(scenario);
        expect(r.kind).toBe("failure");
        expect(r.vector).toBeNull();
        expect(r.onboardedAt).toBe(false);
        expect(r.httpStatus).toBe(503);
      });
    });
  });

  it("'failure' end-state never writes a partial state (no vector, no onboarded_at)", () => {
    const r = bootstrap({ path: "llm", gemini: "fail", embedding: "ok" });
    expect(r.vector).toBeNull();
    expect(r.onboardedAt).toBe(false);
  });

  it("forbidden: third 'soft-failed' end-state where onboarded_at is set without a vector from LLM", () => {
    // Allowed states table — any Outcome not in this table is a contamination bug.
    const allowed = new Set(["llm-onboarded", "skipped", "failure"]);
    const scenarios: Inputs[] = [
      { path: "llm", gemini: "ok", embedding: "ok" },
      { path: "skip", gemini: "ok", embedding: "ok" },
      { path: "llm", gemini: "fail", embedding: "ok" },
      { path: "llm", gemini: "ok", embedding: "fail" },
      { path: "llm", gemini: "timeout", embedding: "fail" },
    ];
    for (const s of scenarios) {
      const r = bootstrap(s);
      expect(allowed.has(r.kind)).toBe(true);
      if (r.kind === "failure") {
        expect(r.onboardedAt).toBe(false);
      }
    }
  });

  it("forbidden: silent fallback to raw-prompt embedding when Gemini fails", () => {
    // Production MUST NOT take Gemini-failure and embed the raw prompt as
    // a fallback. If a future refactor adds that path, this test should
    // be changed to use a new rule ("degraded-onboarding"), not silently
    // pass, which is why we pin the hard-fail contract here.
    const r = bootstrap({ path: "llm", gemini: "fail", embedding: "ok" });
    expect(r.kind).not.toBe("llm-onboarded");
    expect(r.vector).toBeNull();
  });

  it("forbidden: silent fallback to skipped end-state when any upstream fails", () => {
    const r = bootstrap({ path: "llm", gemini: "fail", embedding: "ok" });
    expect(r.kind).not.toBe("skipped");
    expect(r.onboardedAt).toBe(false);
  });
});
