import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockSet, mockFindFirst, mockReturning, mockDb } = vi.hoisted(() => {
  const mockReturning = vi.fn();
  return {
    mockSet: vi.fn(),
    mockFindFirst: vi.fn(),
    mockReturning,
    mockDb: {
      query: { profiles: { findFirst: vi.fn() } },
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoNothing: vi.fn(() => ({
            returning: mockReturning,
          })),
        })),
      })),
    },
  };
});

mockDb.query.profiles.findFirst = mockFindFirst;

vi.mock("next/headers", () => ({
  cookies: async () => ({ set: mockSet }),
}));

vi.mock("@/db", () => ({
  db: mockDb,
  profiles: { login: "profiles.login" },
}));

import { POST } from "./route";

function loginRequest(login: string) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login }),
  });
}

beforeEach(() => {
  mockSet.mockReset();
  mockFindFirst.mockReset();
  mockReturning.mockReset();
});

afterEach(() => vi.clearAllMocks());

describe("POST /api/auth/login — REQ-10 redirect target", () => {
  it("returns redirect=/onboarding when profile is freshly INSERTed", async () => {
    mockReturning.mockResolvedValue([
      {
        id: "u1",
        login: "new-user",
        displayName: "new-user",
        onboardedAt: null,
      },
    ]);

    const res = await POST(loginRequest("new-user"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, redirect: "/onboarding" });
  });

  it("returns redirect=/feed for existing onboarded user", async () => {
    mockReturning.mockResolvedValue([]); // ON CONFLICT DO NOTHING → no row
    mockFindFirst.mockResolvedValue({
      id: "u1",
      login: "existing",
      onboardedAt: new Date("2026-04-20"),
    });

    const res = await POST(loginRequest("existing"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, redirect: "/feed" });
  });

  it("returns redirect=/onboarding for existing user without onboarded_at", async () => {
    mockReturning.mockResolvedValue([]);
    mockFindFirst.mockResolvedValue({
      id: "u2",
      login: "half",
      onboardedAt: null,
    });

    const res = await POST(loginRequest("half"));
    const body = await res.json();
    expect(body).toMatchObject({ redirect: "/onboarding" });
  });
});

describe("POST /api/auth/login — race-safe upsert (scale-review MED-1)", () => {
  it("uses INSERT … ON CONFLICT DO NOTHING RETURNING (no lookup-then-insert race)", async () => {
    mockReturning.mockResolvedValue([
      { id: "u1", login: "x", onboardedAt: null },
    ]);
    await POST(loginRequest("x"));
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/auth/login — validation", () => {
  it("400 on empty login", async () => {
    const res = await POST(loginRequest(""));
    expect(res.status).toBe(400);
  });
});
