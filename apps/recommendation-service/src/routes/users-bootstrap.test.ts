import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockBootstrapUser = vi.fn()

vi.mock("../services/bootstrap", () => ({
  bootstrapUser: (input: unknown) => mockBootstrapUser(input),
}))

vi.mock("../services/users", () => ({
  resetUser: vi.fn(),
}))

vi.mock("../services/score-breakdown", () => ({
  getScoreBreakdown: vi.fn(),
}))

import { createApp } from "../app"

const app = createApp({ basePath: "/api/v1" })

beforeEach(() => {
  mockBootstrapUser.mockReset()
})

afterEach(() => vi.clearAllMocks())

async function postBootstrap(externalUserId: string, body: unknown) {
  return app.request(`/api/v1/users/${externalUserId}/bootstrap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /users/:externalUserId/bootstrap — happy path (REQ-5)", () => {
  it("200 with preferenceVectorSet=true and structured enrichment", async () => {
    mockBootstrapUser.mockResolvedValue({
      preferenceVectorSet: true,
      enrichment: {
        paragraph: "Тобі подобаються драми.",
        genres: ["drama"],
        similarTitles: ["Manchester by the Sea"],
      },
    })
    const res = await postBootstrap("u1", { rawPrompt: "Триллери" })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      preferenceVectorSet: true,
      enrichment: {
        paragraph: "Тобі подобаються драми.",
        genres: ["drama"],
        similarTitles: ["Manchester by the Sea"],
      },
    })
  })

  it("200 LLM path with empty similarTitles still parses (similarTitles may be empty)", async () => {
    mockBootstrapUser.mockResolvedValue({
      preferenceVectorSet: true,
      enrichment: {
        paragraph: "Тобі подобаються драми.",
        genres: ["drama"],
        similarTitles: [],
      },
    })
    const res = await postBootstrap("u1", { rawPrompt: "x" })
    expect(res.status).toBe(200)
  })

  it("200 skip path with preferenceVectorSet=false (no rawPrompt)", async () => {
    mockBootstrapUser.mockResolvedValue({ preferenceVectorSet: false })
    const res = await postBootstrap("u2", {})
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ preferenceVectorSet: false })
  })

  it("calls bootstrapUser service with externalUserId from path", async () => {
    mockBootstrapUser.mockResolvedValue({ preferenceVectorSet: false })
    await postBootstrap("user-abc", { rawPrompt: "x" })
    expect(mockBootstrapUser).toHaveBeenCalledWith({
      externalUserId: "user-abc",
      rawPrompt: "x",
    })
  })
})

describe("POST /users/:externalUserId/bootstrap — validation errors (REQ-5)", () => {
  it("400 on empty rawPrompt string", async () => {
    const res = await postBootstrap("u1", { rawPrompt: "" })
    expect(res.status).toBe(400)
  })

  it("400 on rawPrompt longer than 2000", async () => {
    const res = await postBootstrap("u1", { rawPrompt: "x".repeat(2001) })
    expect(res.status).toBe(400)
  })

  it("400 on rawPrompt non-string", async () => {
    const res = await postBootstrap("u1", { rawPrompt: 123 })
    expect(res.status).toBe(400)
  })
})

describe("POST /users/:externalUserId/bootstrap — error mapping (REQ-5)", () => {
  it("503 on unparsable_json from Gemini wrapper", async () => {
    const { BootstrapEnrichmentError } = await import("../lib/errors")
    mockBootstrapUser.mockRejectedValue(
      new BootstrapEnrichmentError("unparsable_json", "bad json"),
    )
    const res = await postBootstrap("u1", { rawPrompt: "x" })
    expect(res.status).toBe(400)
  })

  it("422 on safety_blocked", async () => {
    const { BootstrapEnrichmentError } = await import("../lib/errors")
    mockBootstrapUser.mockRejectedValue(
      new BootstrapEnrichmentError("safety_blocked", "blocked"),
    )
    const res = await postBootstrap("u1", { rawPrompt: "x" })
    expect(res.status).toBe(422)
  })

  it("422 on empty_after_filter", async () => {
    const { BootstrapEnrichmentError } = await import("../lib/errors")
    mockBootstrapUser.mockRejectedValue(
      new BootstrapEnrichmentError("empty_after_filter", "no genres"),
    )
    const res = await postBootstrap("u1", { rawPrompt: "qwertyzz" })
    expect(res.status).toBe(422)
  })

  it("503 on quota_exceeded with Retry-After header", async () => {
    const { BootstrapEnrichmentError } = await import("../lib/errors")
    mockBootstrapUser.mockRejectedValue(
      new BootstrapEnrichmentError("quota_exceeded", "Gemini 429"),
    )
    const res = await postBootstrap("u1", { rawPrompt: "x" })
    expect(res.status).toBe(503)
    expect(res.headers.get("Retry-After")).toBe("60")
  })

  it("503 on AbortError / network failure", async () => {
    mockBootstrapUser.mockRejectedValue(
      new DOMException("Aborted", "AbortError"),
    )
    const res = await postBootstrap("u1", { rawPrompt: "x" })
    expect(res.status).toBe(503)
  })

  it("500 on unexpected error", async () => {
    mockBootstrapUser.mockRejectedValue(new Error("boom"))
    const res = await postBootstrap("u1", { rawPrompt: "x" })
    expect(res.status).toBe(500)
  })

  it("error body has shape { error: { message } }", async () => {
    mockBootstrapUser.mockRejectedValue(new Error("boom"))
    const res = await postBootstrap("u1", { rawPrompt: "x" })
    const body = await res.json()
    expect(body).toMatchObject({ error: { message: expect.any(String) } })
  })
})

describe("POST /users/:externalUserId/bootstrap — response Zod parse (REQ-5)", () => {
  it("response is validated with bootstrapResponse before json()", async () => {
    mockBootstrapUser.mockResolvedValue({
      preferenceVectorSet: true,
      enrichment: {
        paragraph: "ok",
        genres: ["drama"],
        similarTitles: [],
      },
    })
    const res = await postBootstrap("u1", { rawPrompt: "x" })
    const body = await res.json()
    expect(Object.keys(body).sort()).toEqual(
      ["enrichment", "preferenceVectorSet"].sort(),
    )
  })
})
