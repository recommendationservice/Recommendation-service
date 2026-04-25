import { z } from "zod"

export const createContentSchema = z.object({
  externalId: z.string().min(1),
  type: z.string().min(1),
  textForEmbedding: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export const updateContentSchema = z.object({
  externalId: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  textForEmbedding: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const contentIdParam = z.object({
  id: z.string().uuid(),
})

export const createEventSchema = z.object({
  userId: z.string().min(1),
  contentId: z.string().uuid(),
  eventType: z.enum(["view", "read", "deep_read", "like", "share", "dislike", "bookmark"]),
  weight: z.number().int().min(-10).max(10),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
})

export const getEventsQuery = z.object({
  userId: z.string().min(1),
})

export const getRecommendationsQuery = z.object({
  userId: z.string().min(1),
  type: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const getScoreBreakdownParams = z.object({
  externalUserId: z.string().min(1),
})

const jsonIdentifier = z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/).max(64)

export const getScoreBreakdownQuery = z.object({
  groupBy: jsonIdentifier,
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const bootstrapParams = z.object({
  externalUserId: z.string().min(1),
})

export const bootstrapBody = z.object({
  rawPrompt: z.string().min(1).max(2000).optional(),
})

const enrichmentSchema = z.object({
  paragraph: z.string().min(1),
  genres: z.array(z.string()).min(1),
  similarTitles: z.array(z.string()),
})

export const bootstrapResponse = z.object({
  preferenceVectorSet: z.boolean(),
  enrichment: enrichmentSchema.optional(),
})

export const profileStateParams = z.object({
  externalUserId: z.string().min(1),
})

export const profileStateResponse = z.object({
  hasPreferenceVector: z.boolean(),
})
