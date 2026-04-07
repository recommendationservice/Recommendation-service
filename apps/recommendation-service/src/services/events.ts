import { eq, desc, sql } from "drizzle-orm"
import type { ExtractTablesWithRelations } from "drizzle-orm"
import type { PgTransaction } from "drizzle-orm/pg-core"
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js"

import { db } from "../db/client"
import { events, content, userProfiles, viewHistory } from "../db/schema"
import type * as schema from "../db/schema"
import { AppError } from "../lib/errors"
import { initialPreferenceVector, updatePreferenceVector } from "../lib/vector-math"

const MAX_EVENTS_PER_QUERY = 100

type Tx = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>

export async function createEvent(data: {
  userId: string
  contentId: string
  eventType: string
  weight: number
  metadata: Record<string, unknown>
}) {
  const [contentItem] = await db
    .select({
      id: content.id,
      embedding: content.embedding,
      isActive: content.isActive,
    })
    .from(content)
    .where(eq(content.id, data.contentId))
    .limit(1)

  if (!contentItem || !contentItem.isActive || !contentItem.embedding) {
    throw new AppError(400, "Content not found or inactive")
  }

  return db.transaction(async (tx) => {
    const [event] = await tx
      .insert(events)
      .values({
        userId: data.userId,
        contentId: data.contentId,
        eventType: data.eventType,
        weight: data.weight,
        metadata: data.metadata,
      })
      .returning()

    const profile = await findOrCreateProfile(tx, data.userId)
    await updateUserPreferences(tx, profile, contentItem.embedding!, data.weight)
    await upsertViewHistory(tx, profile.id, data.contentId)

    return event
  })
}

async function findOrCreateProfile(tx: Tx, externalUserId: string) {
  const [existing] = await tx
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.externalUserId, externalUserId))
    .limit(1)

  if (existing) return existing

  const [created] = await tx
    .insert(userProfiles)
    .values({ externalUserId })
    .returning()

  return created
}

async function updateUserPreferences(
  tx: Tx,
  profile: typeof userProfiles.$inferSelect,
  contentEmbedding: number[],
  eventWeight: number,
) {
  let newVector: number[]
  let newTotalWeight: number

  if (!profile.preferenceVector) {
    newVector = initialPreferenceVector(contentEmbedding, eventWeight)
    newTotalWeight = Math.abs(eventWeight)
  } else {
    newVector = updatePreferenceVector(
      profile.preferenceVector!,
      profile.totalWeight,
      contentEmbedding,
      eventWeight,
    )
    newTotalWeight = profile.totalWeight + Math.abs(eventWeight)
  }

  await tx
    .update(userProfiles)
    .set({
      preferenceVector: newVector,
      totalWeight: newTotalWeight,
      totalEvents: profile.totalEvents + 1,
      lastActiveAt: new Date(),
    })
    .where(eq(userProfiles.id, profile.id))
}

async function upsertViewHistory(tx: Tx, profileId: string, contentId: string) {
  await tx
    .insert(viewHistory)
    .values({
      userId: profileId,
      contentId,
    })
    .onConflictDoUpdate({
      target: [viewHistory.userId, viewHistory.contentId],
      set: {
        viewCount: sql`${viewHistory.viewCount} + 1`,
        lastSeenAt: sql`now()`,
      },
    })
}

export async function getEventsByUser(userId: string) {
  return db
    .select()
    .from(events)
    .where(eq(events.userId, userId))
    .orderBy(desc(events.createdAt))
    .limit(MAX_EVENTS_PER_QUERY)
}
