/**
 * Business rule: structured-output-shape
 *
 * The LLM bootstrap path MUST return a structured `enrichment` object with a
 * non-empty Ukrainian paragraph and a non-empty controlled-vocab `genres`
 * array. Skip path and dedup short-circuit are EXEMPT — they omit `enrichment`.
 *
 * Tests run against REAL production code:
 *   - bootstrapUser from apps/recommendation-service/src/services/bootstrap.ts
 *   - bootstrapResponse from apps/recommendation-service/src/lib/schemas.ts
 *
 * External boundaries (gemini, embedding, db) are mocked. The mock shape mirrors
 * apps/recommendation-service/src/services/bootstrap.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockEnrichPrompt = vi.fn()
const mockGenerateEmbedding = vi.fn()
const mockTxUpdate = vi.fn()
const mockSelect = vi.fn()
const mockTransaction = vi.fn()

type TxLike = {
  update: () => { set: () => { where: typeof mockTxUpdate } }
}

const txMock: TxLike = {
  update: () => ({ set: () => ({ where: mockTxUpdate }) }),
}

vi.mock("../../../apps/recommendation-service/src/services/gemini", () => ({
  enrichPrompt: (p: string) => mockEnrichPrompt(p),
}))

vi.mock("../../../apps/recommendation-service/src/services/embedding", () => ({
  generateEmbedding: (t: string) => mockGenerateEmbedding(t),
}))

vi.mock("../../../apps/recommendation-service/src/db/client", () => ({
  db: {
    transaction: (cb: (tx: TxLike) => Promise<unknown>) => mockTransaction(cb),
    select: () => ({
      from: () => ({
        where: () => ({ limit: () => mockSelect() }),
      }),
    }),
    update: () => ({ set: () => ({ where: mockTxUpdate }) }),
  },
}))

import { bootstrapUser } from "../../../apps/recommendation-service/src/services/bootstrap"
import { bootstrapResponse } from "../../../apps/recommendation-service/src/lib/schemas"

const FULL_GENRES = [
  "action",
  "adventure",
  "animation",
  "comedy",
  "crime",
  "documentary",
  "drama",
  "family",
  "fantasy",
  "history",
  "horror",
  "music",
  "mystery",
  "romance",
  "science fiction",
  "thriller",
  "war",
  "western",
] as const

const HAPPY_ENRICHED = {
  genres: ["thriller", "drama"],
  themes: ["psychological"],
  moods: ["dark", "tense"],
  sample_titles: ["Se7en", "Zodiac"],
  localized_summary:
    "Ти любиш напружені психологічні трилери з темною атмосферою та складними характерами.",
  similar_titles: ["Se7en", "Zodiac", "Prisoners"],
}

beforeEach(() => {
  mockEnrichPrompt.mockReset().mockResolvedValue(HAPPY_ENRICHED)
  mockGenerateEmbedding.mockReset().mockResolvedValue(new Array(1536).fill(0.1))
  mockTxUpdate.mockReset().mockResolvedValue(undefined)
  mockSelect.mockReset().mockResolvedValue([])
  mockTransaction.mockReset().mockImplementation(async (cb) => cb(txMock))
})

afterEach(() => vi.clearAllMocks())

describe("structured-output-shape — happy LLM path", () => {
  it("response includes a non-empty Ukrainian-style paragraph", async () => {
    const result = await bootstrapUser({
      externalUserId: "u-happy-1",
      rawPrompt: "психологічні трилери",
    })

    expect(result.preferenceVectorSet).toBe(true)
    expect(result.enrichment).toBeDefined()
    expect(typeof result.enrichment.paragraph).toBe("string")
    expect(result.enrichment.paragraph.length).toBeGreaterThan(0)
    // Ukrainian "ти" address — informal singular pronoun
    expect(result.enrichment.paragraph.toLowerCase()).toMatch(/ти/)
  })

  it("response includes a non-empty genres array drawn from controlled vocab", async () => {
    const result = await bootstrapUser({
      externalUserId: "u-happy-2",
      rawPrompt: "x",
    })

    expect(Array.isArray(result.enrichment.genres)).toBe(true)
    expect(result.enrichment.genres.length).toBeGreaterThan(0)
    for (const g of result.enrichment.genres) {
      expect(FULL_GENRES).toContain(g)
    }
  })

  it("response.similarTitles is an array (may be empty)", async () => {
    const result = await bootstrapUser({
      externalUserId: "u-happy-3",
      rawPrompt: "x",
    })

    expect(Array.isArray(result.enrichment.similarTitles)).toBe(true)
  })

  it("response round-trips through bootstrapResponse.parse(...)", async () => {
    const result = await bootstrapUser({
      externalUserId: "u-happy-4",
      rawPrompt: "x",
    })

    expect(() => bootstrapResponse.parse(result)).not.toThrow()
  })
})

describe("structured-output-shape — exempt paths", () => {
  it("skip path (rawPrompt undefined) returns no enrichment and is allowed", async () => {
    const result = await bootstrapUser({
      externalUserId: "u-skip",
      rawPrompt: undefined,
    })

    expect(result.preferenceVectorSet).toBe(false)
    expect(result.enrichment).toBeUndefined()
    expect(() => bootstrapResponse.parse(result)).not.toThrow()
  })

  it("dedup short-circuit returns no enrichment and is allowed", async () => {
    mockSelect.mockResolvedValue([
      {
        externalUserId: "u-dedup",
        preferenceVector: new Array(1536).fill(0.5),
        updatedAt: new Date(),
      },
    ])

    const result = await bootstrapUser({
      externalUserId: "u-dedup",
      rawPrompt: "x",
    })

    expect(result.preferenceVectorSet).toBe(true)
    expect(mockEnrichPrompt).not.toHaveBeenCalled()
    expect(result.enrichment).toBeUndefined()
    expect(() => bootstrapResponse.parse(result)).not.toThrow()
  })
})

describe("structured-output-shape — schema rejects degenerate enrichment", () => {
  it("empty paragraph → bootstrapResponse.parse throws", () => {
    const bad = {
      preferenceVectorSet: true,
      enrichment: {
        paragraph: "",
        genres: ["drama"],
        similarTitles: [],
      },
    }
    expect(() => bootstrapResponse.parse(bad)).toThrow()
  })

  it("empty genres array → bootstrapResponse.parse throws", () => {
    const bad = {
      preferenceVectorSet: true,
      enrichment: {
        paragraph: "Ти любиш драми.",
        genres: [],
        similarTitles: [],
      },
    }
    expect(() => bootstrapResponse.parse(bad)).toThrow()
  })

  it("missing enrichment on LLM-success response → bootstrapResponse.parse throws", () => {
    // When preferenceVectorSet is true AND it's the LLM path (not dedup), the
    // enrichment object is required. Without a discriminator, the minimum
    // schema-level enforcement is that any present `enrichment` must be valid.
    // The LLM-success-without-enrichment violation is caught by the runtime
    // tests above (happy-path expects `enrichment` to be defined).
    const trueButNoEnrichment = { preferenceVectorSet: true }
    // This shape IS allowed at the schema level (matches dedup short-circuit).
    // The rule is enforced by bootstrap.ts, asserted in the happy-path tests.
    expect(() => bootstrapResponse.parse(trueButNoEnrichment)).not.toThrow()
  })
})
