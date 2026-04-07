import { eq, and, desc, sql, notInArray, cosineDistance } from "drizzle-orm"

import { db } from "../db/client"
import { content, userProfiles, viewHistory, events } from "../db/schema"

const WARM_USER_THRESHOLD = 5

type RecommendationItem = {
  id: string
  externalId: string
  type: string
  metadata: unknown
  score: number
}

type RecommendationResult = {
  recommendations: RecommendationItem[]
  strategy: "personalized" | "cold_start"
}

export async function getRecommendations(params: {
  userId: string
  type?: string
  limit: number
}): Promise<RecommendationResult> {
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.externalUserId, params.userId))
    .limit(1)

  const viewedContentIds = profile ? await getViewedContentIds(profile.id) : []

  if (profile?.preferenceVector && profile.totalEvents >= WARM_USER_THRESHOLD) {
    return getPersonalizedRecommendations(
      profile.preferenceVector!,
      viewedContentIds,
      params,
    )
  }

  return getColdStartRecommendations(viewedContentIds, params)
}

async function getViewedContentIds(profileId: string): Promise<string[]> {
  const viewed = await db
    .select({ contentId: viewHistory.contentId })
    .from(viewHistory)
    .where(eq(viewHistory.userId, profileId))

  return viewed.map((v) => v.contentId)
}

async function getPersonalizedRecommendations(
  preferenceVector: number[],
  viewedContentIds: string[],
  params: { type?: string; limit: number },
): Promise<RecommendationResult> {
  const similarity = sql<number>`1 - (${cosineDistance(content.embedding, preferenceVector)})`

  const conditions = [
    eq(content.isActive, true),
    sql`${content.embedding} IS NOT NULL`,
    ...(viewedContentIds.length > 0 ? [notInArray(content.id, viewedContentIds)] : []),
    ...(params.type ? [eq(content.type, params.type)] : []),
  ]

  const results = await db
    .select({
      id: content.id,
      externalId: content.externalId,
      type: content.type,
      metadata: content.metadata,
      score: similarity,
    })
    .from(content)
    .where(and(...conditions))
    .orderBy(desc(similarity))
    .limit(params.limit)

  return {
    recommendations: results.map((r) => ({
      id: r.id,
      externalId: r.externalId,
      type: r.type,
      metadata: r.metadata,
      score: Number(r.score),
    })),
    strategy: "personalized",
  }
}

async function getColdStartRecommendations(
  viewedContentIds: string[],
  params: { type?: string; limit: number },
): Promise<RecommendationResult> {
  const eventCount = sql<number>`COALESCE((
    SELECT COUNT(*)::int FROM ${events}
    WHERE ${events.contentId} = ${content.id} AND ${events.weight} > 0
  ), 0)`

  const conditions = [
    eq(content.isActive, true),
    ...(viewedContentIds.length > 0 ? [notInArray(content.id, viewedContentIds)] : []),
    ...(params.type ? [eq(content.type, params.type)] : []),
  ]

  const results = await db
    .select({
      id: content.id,
      externalId: content.externalId,
      type: content.type,
      metadata: content.metadata,
      score: eventCount,
    })
    .from(content)
    .where(and(...conditions))
    .orderBy(desc(eventCount), desc(content.createdAt))
    .limit(params.limit)

  return {
    recommendations: results.map((r) => ({
      id: r.id,
      externalId: r.externalId,
      type: r.type,
      metadata: r.metadata,
      score: Number(r.score),
    })),
    strategy: "cold_start",
  }
}
