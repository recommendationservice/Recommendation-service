import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockBootstrapUser,
  mockResetUser,
  mockGetSessionProfile,
  mockDbUpdate,
} = vi.hoisted(() => ({
  mockBootstrapUser: vi.fn(),
  mockResetUser: vi.fn(),
  mockGetSessionProfile: vi.fn(),
  mockDbUpdate: vi.fn(),
}));

vi.mock("@/shared/lib/reco-client", () => ({
  getRecoClient: () => ({
    bootstrapUser: mockBootstrapUser,
    resetUser: mockResetUser,
    getRecommendations: vi.fn(),
    recordEvent: vi.fn(),
    getScoreBreakdown: vi.fn(),
  }),
}));

vi.mock("@/shared/lib/session", () => ({
  getSessionProfile: () => mockGetSessionProfile(),
  SESSION_COOKIE: "demo-session",
}));

vi.mock("@/db", () => ({
  db: {
    update: () => ({
      set: () => ({ where: mockDbUpdate }),
    }),
  },
  profiles: { id: "profiles.id" },
}));

import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/demo/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockBootstrapUser.mockReset();
  mockGetSessionProfile.mockReset();
  mockDbUpdate.mockReset().mockResolvedValue(undefined);
  mockGetSessionProfile.mockResolvedValue({
    id: "u1",
    login: "demo-user",
    onboardedAt: null,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/demo/onboarding — auth", () => {
  it("returns 401 if no session", async () => {
    mockGetSessionProfile.mockResolvedValue(null);
    const res = await POST(makeRequest({ rawPrompt: null }));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/demo/onboarding — Skip path (Scenario 2, REQ-4)", () => {
  it("rawPrompt=null does NOT call recoClient.bootstrapUser", async () => {
    const res = await POST(makeRequest({ rawPrompt: null }));
    expect(res.status).toBe(200);
    expect(mockBootstrapUser).not.toHaveBeenCalled();
  });

  it("rawPrompt=null sets onboarded_at via demo DB UPDATE", async () => {
    await POST(makeRequest({ rawPrompt: null }));
    expect(mockDbUpdate).toHaveBeenCalledTimes(1);
  });

  it("returns { ok: true } without enrichedText", async () => {
    const res = await POST(makeRequest({ rawPrompt: null }));
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });
});

describe("POST /api/demo/onboarding — LLM happy path (Scenario 1, REQ-4)", () => {
  beforeEach(() => {
    mockBootstrapUser.mockResolvedValue({
      preferenceVectorSet: true,
      enrichedText: "A user enjoys thriller, drama.",
    });
  });

  it("calls recoClient.bootstrapUser with { externalUserId, rawPrompt }", async () => {
    await POST(makeRequest({ rawPrompt: "Триллери" }));
    expect(mockBootstrapUser).toHaveBeenCalledWith({
      externalUserId: "u1",
      rawPrompt: "Триллери",
    });
  });

  it("sets onboarded_at AFTER successful reco call (cohort-integrity order)", async () => {
    const callOrder: string[] = [];
    mockBootstrapUser.mockImplementation(async () => {
      callOrder.push("reco");
      return { preferenceVectorSet: true, enrichedText: "x" };
    });
    mockDbUpdate.mockImplementation(async () => {
      callOrder.push("db");
    });

    await POST(makeRequest({ rawPrompt: "ok" }));
    expect(callOrder).toEqual(["reco", "db"]);
  });

  it("returns 200 with ok=true and enrichedText", async () => {
    const res = await POST(makeRequest({ rawPrompt: "ok" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      enrichedText: "A user enjoys thriller, drama.",
    });
  });
});

describe("POST /api/demo/onboarding — Reco failure (Scenario 3, REQ-4 + REQ-12)", () => {
  it("503 from reco bubbles up; onboarded_at NOT set (cohort-integrity)", async () => {
    const { RecoApiError } = await import("@sp/reco-sdk");
    mockBootstrapUser.mockRejectedValue(
      new RecoApiError(503, "AI down", { error: { message: "..." } }),
    );

    const res = await POST(makeRequest({ rawPrompt: "x" }));
    expect(res.status).toBe(503);
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });

  it("400/422 from reco surfaces same status to client", async () => {
    const { RecoApiError } = await import("@sp/reco-sdk");
    mockBootstrapUser.mockRejectedValue(
      new RecoApiError(422, "empty", { error: { message: "no genres" } }),
    );

    const res = await POST(makeRequest({ rawPrompt: "qwertyzz" }));
    expect(res.status).toBe(422);
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });

  it("unexpected error → 500, no onboarded_at set", async () => {
    mockBootstrapUser.mockRejectedValue(new Error("boom"));
    const res = await POST(makeRequest({ rawPrompt: "x" }));
    expect(res.status).toBe(500);
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });
});

describe("POST /api/demo/onboarding — Validation", () => {
  it("rawPrompt of wrong type → 400", async () => {
    const res = await POST(makeRequest({ rawPrompt: 123 }));
    expect(res.status).toBe(400);
  });

  it("missing body → 400", async () => {
    const req = new Request("http://localhost/api/demo/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
