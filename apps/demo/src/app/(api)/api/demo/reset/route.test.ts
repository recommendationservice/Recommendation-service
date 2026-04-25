import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockResetUser, mockGetSessionProfile, mockDb, txMock, txCalls } =
  vi.hoisted(() => {
    const txCalls: string[] = [];
    const recordTx = (label: string) => async () => {
      txCalls.push(label);
    };
    const txMock = {
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: recordTx("tx.update.profiles.onboarded_at=null"),
        })),
      })),
      delete: vi.fn((table: { name?: string }) => ({
        where: recordTx(`tx.delete.${table.name ?? "?"}`),
      })),
    };
    const mockDb = {
      transaction: vi.fn(
        async (cb: (tx: typeof txMock) => Promise<unknown>) => {
          txCalls.push("tx-begin");
          const result = await cb(txMock);
          txCalls.push("tx-commit");
          return result;
        },
      ),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: recordTx("db.update.profiles.onboarded_at=null"),
        })),
      })),
      delete: vi.fn((table: { name?: string }) => ({
        where: recordTx(`db.delete.${table.name ?? "?"}`),
      })),
    };
    return {
      mockResetUser: vi.fn(),
      mockGetSessionProfile: vi.fn(),
      mockDb,
      txMock,
      txCalls,
    };
  });

vi.mock("@/db", () => ({
  db: mockDb,
  bookmarks: { name: "bookmarks" },
  likes: { name: "likes" },
  profiles: { name: "profiles" },
}));

vi.mock("@/shared/lib/reco-client", () => ({
  getRecoClient: () => ({
    resetUser: mockResetUser,
    bootstrapUser: vi.fn(),
    getRecommendations: vi.fn(),
    recordEvent: vi.fn(),
    getScoreBreakdown: vi.fn(),
  }),
}));

vi.mock("@/shared/lib/session", () => ({
  getSessionProfile: () => mockGetSessionProfile(),
  SESSION_COOKIE: "demo-session",
}));

import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/demo/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  txCalls.length = 0;
  mockDb.transaction.mockClear();
  mockDb.update.mockClear();
  mockDb.delete.mockClear();
  txMock.update.mockClear();
  txMock.delete.mockClear();
  mockResetUser.mockReset().mockResolvedValue(undefined);
  mockGetSessionProfile.mockReset().mockResolvedValue({
    id: "u1",
    login: "demo-user",
  });
});

afterEach(() => vi.clearAllMocks());

describe("POST /api/demo/reset — onboarded_at clearing (REQ-11, Scenario 5)", () => {
  it("UPDATEs profiles.onboarded_at = NULL inside transaction (not on outer db)", async () => {
    const res = await POST(makeRequest({ confirmLogin: "demo-user" }));
    expect(res.status).toBe(200);
    expect(txMock.update).toHaveBeenCalled();
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("wraps demo-side mutations in single transaction (per scale-review HIGH-1)", async () => {
    await POST(makeRequest({ confirmLogin: "demo-user" }));
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(txCalls[0]).toBe("tx-begin");
    expect(txCalls[txCalls.length - 1]).toBe("tx-commit");
  });

  it("calls reco resetUser AFTER demo transaction commits", async () => {
    let recoCalledBeforeCommit = false;
    mockResetUser.mockImplementation(async () => {
      recoCalledBeforeCommit = !txCalls.includes("tx-commit") ? false : true;
    });
    await POST(makeRequest({ confirmLogin: "demo-user" }));
    expect(recoCalledBeforeCommit).toBe(true);
  });

  it("reco resetUser failure does NOT undo demo onboarded_at clear (per business rule)", async () => {
    mockResetUser.mockRejectedValue(new Error("reco down"));
    const res = await POST(makeRequest({ confirmLogin: "demo-user" }));
    expect(res.status).toBe(200);
    expect(
      txCalls.some((c) => c.includes("tx.update.profiles.onboarded_at=null")),
    ).toBe(true);
  });
});

describe("POST /api/demo/reset — auth + validation", () => {
  it("401 when no session", async () => {
    mockGetSessionProfile.mockResolvedValue(null);
    const res = await POST(makeRequest({ confirmLogin: "demo-user" }));
    expect(res.status).toBe(401);
  });

  it("400 when confirmLogin mismatches", async () => {
    const res = await POST(makeRequest({ confirmLogin: "wrong" }));
    expect(res.status).toBe(400);
  });
});
