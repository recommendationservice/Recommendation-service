import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockEnrichPrompt = vi.fn()
const mockGenerateEmbedding = vi.fn()
const mockDbUpdate = vi.fn()
const mockTxUpdate = vi.fn()
const mockSelect = vi.fn()
const mockTransaction = vi.fn()

type TxLike = {
  update: () => { set: () => { where: typeof mockTxUpdate } }
}

const txMock: TxLike = {
  update: () => ({ set: () => ({ where: mockTxUpdate }) }),
}

vi.mock("./gemini", () => ({
  enrichPrompt: (p: string) => mockEnrichPrompt(p),
}))

vi.mock("./embedding", () => ({
  generateEmbedding: (t: string) => mockGenerateEmbedding(t),
}))

vi.mock("../db/client", () => ({
  db: {
    transaction: (cb: (tx: TxLike) => Promise<unknown>) => mockTransaction(cb),
    select: () => ({
      from: () => ({
        where: () => ({ limit: () => mockSelect() }),
      }),
    }),
    update: () => ({ set: () => ({ where: mockDbUpdate }) }),
  },
}))

import { bootstrapUser } from "./bootstrap"

beforeEach(() => {
  mockEnrichPrompt.mockReset()
  mockGenerateEmbedding.mockReset()
  mockDbUpdate.mockReset().mockResolvedValue(undefined)
  mockTxUpdate.mockReset().mockResolvedValue(undefined)
  mockSelect.mockReset().mockResolvedValue([])
  mockTransaction.mockReset().mockImplementation(async (cb) => cb(txMock))
})

afterEach(() => vi.clearAllMocks())

describe("bootstrapUser — Skip path (REQ-5, REQ-6)", () => {
  it("rawPrompt undefined → no Gemini call, no embedding call, no UPDATE", async () => {
    const result = await bootstrapUser({
      externalUserId: "u1",
      rawPrompt: undefined,
    })
    expect(mockEnrichPrompt).not.toHaveBeenCalled()
    expect(mockGenerateEmbedding).not.toHaveBeenCalled()
    expect(result).toEqual({ preferenceVectorSet: false })
  })

  it("rawPrompt undefined → no row created in user_profiles (lazy creation, skip-semantics)", async () => {
    await bootstrapUser({ externalUserId: "u2", rawPrompt: undefined })
    expect(mockTxUpdate).not.toHaveBeenCalled()
  })
})

describe("bootstrapUser — LLM happy path (REQ-6, REQ-8)", () => {
  beforeEach(() => {
    mockEnrichPrompt.mockResolvedValue({
      genres: ["thriller", "drama"],
      themes: ["psychological"],
      moods: ["dark", "tense"],
      sample_titles: ["Se7en", "Zodiac"],
    })
    mockGenerateEmbedding.mockResolvedValue(new Array(1536).fill(0.1))
  })

  it("calls enrichPrompt → generateEmbedding → DB UPDATE in order", async () => {
    const order: string[] = []
    mockEnrichPrompt.mockImplementation(async () => {
      order.push("enrich")
      return {
        genres: ["drama"],
        themes: [],
        moods: ["dark"],
        sample_titles: [],
      }
    })
    mockGenerateEmbedding.mockImplementation(async () => {
      order.push("embed")
      return new Array(1536).fill(0)
    })
    mockTxUpdate.mockImplementation(async () => {
      order.push("update")
    })

    await bootstrapUser({ externalUserId: "u1", rawPrompt: "ok" })
    expect(order).toEqual(["enrich", "embed", "update"])
  })

  it("synthesizes canonical text (REQ-8): 'User enjoys ...' shape", async () => {
    let capturedText = ""
    mockGenerateEmbedding.mockImplementation(async (text: string) => {
      capturedText = text
      return new Array(1536).fill(0)
    })

    await bootstrapUser({ externalUserId: "u1", rawPrompt: "x" })
    expect(capturedText).toMatch(/thriller/i)
    expect(capturedText).toMatch(/drama/i)
    expect(capturedText).toMatch(/psychological/i)
    expect(capturedText).toMatch(/dark/i)
    expect(capturedText).toMatch(/Se7en/i)
  })

  it("returns { preferenceVectorSet: true, enrichment: { paragraph, genres, similarTitles } }", async () => {
    const result = await bootstrapUser({
      externalUserId: "u1",
      rawPrompt: "x",
    })
    expect(result.preferenceVectorSet).toBe(true)
    expect(result.enrichment?.paragraph.length).toBeGreaterThan(0)
    expect(result.enrichment?.genres).toEqual(["thriller", "drama"])
    expect(result.enrichment?.similarTitles).toEqual(["Se7en", "Zodiac"])
  })
})

describe("bootstrapUser — atomicity (REQ-6, scale-review F1)", () => {
  it("Gemini failure → no embedding call, no UPDATE", async () => {
    mockEnrichPrompt.mockRejectedValue(new Error("gemini down"))
    await expect(
      bootstrapUser({ externalUserId: "u1", rawPrompt: "x" }),
    ).rejects.toThrow()
    expect(mockGenerateEmbedding).not.toHaveBeenCalled()
    expect(mockTxUpdate).not.toHaveBeenCalled()
  })

  it("Embedding failure → no UPDATE", async () => {
    mockEnrichPrompt.mockResolvedValue({
      genres: ["drama"],
      themes: [],
      moods: ["dark"],
      sample_titles: [],
    })
    mockGenerateEmbedding.mockRejectedValue(new Error("openrouter down"))
    await expect(
      bootstrapUser({ externalUserId: "u1", rawPrompt: "x" }),
    ).rejects.toThrow()
    expect(mockTxUpdate).not.toHaveBeenCalled()
  })

  it("external calls happen OUTSIDE transaction (scale-review F1 pool blackout fix)", async () => {
    let txEntered = false
    let enrichInsideTx = false
    let embedInsideTx = false

    mockTransaction.mockImplementation(async (cb) => {
      txEntered = true
      await cb(txMock)
      txEntered = false
    })

    mockEnrichPrompt.mockImplementation(async () => {
      if (txEntered) enrichInsideTx = true
      return {
        genres: ["drama"],
        themes: [],
        moods: ["dark"],
        sample_titles: [],
      }
    })
    mockGenerateEmbedding.mockImplementation(async () => {
      if (txEntered) embedInsideTx = true
      return new Array(1536).fill(0)
    })

    await bootstrapUser({ externalUserId: "u1", rawPrompt: "x" })
    expect(enrichInsideTx).toBe(false)
    expect(embedInsideTx).toBe(false)
  })
})

describe("bootstrapUser — overwrite semantics (REQ-6, business rule)", () => {
  it("overwrites existing preference_vector for same externalUserId", async () => {
    mockSelect.mockResolvedValue([
      {
        externalUserId: "u1",
        preferenceVector: new Array(1536).fill(0.5),
        updatedAt: new Date("2020-01-01"),
      },
    ])
    mockEnrichPrompt.mockResolvedValue({
      genres: ["drama"],
      themes: [],
      moods: ["dark"],
      sample_titles: [],
    })
    mockGenerateEmbedding.mockResolvedValue(new Array(1536).fill(0.9))

    await bootstrapUser({ externalUserId: "u1", rawPrompt: "x" })
    expect(mockTxUpdate).toHaveBeenCalled()
  })
})

describe("bootstrapUser — concurrent dedup (scale-review F3)", () => {
  it("recent updated_at (<5s) short-circuits without calling Gemini", async () => {
    mockSelect.mockResolvedValue([
      {
        externalUserId: "u1",
        preferenceVector: new Array(1536).fill(0.5),
        updatedAt: new Date(),
      },
    ])

    const result = await bootstrapUser({
      externalUserId: "u1",
      rawPrompt: "x",
    })
    expect(mockEnrichPrompt).not.toHaveBeenCalled()
    expect(result.preferenceVectorSet).toBe(true)
  })
})
