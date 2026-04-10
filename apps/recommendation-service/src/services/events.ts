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

type CreateEventInput = {
  userId: string
  contentId: string
  eventType: string
  weight: number
  metadata: Record<string, unknown>
}

type ActiveContent = {
  id: string
  embedding: number[]
  isActive: boolean
}

async function loadActiveContent(contentId: string): Promise<ActiveContent> {
  const [item] = await db
    .select({
      id: content.id,
      embedding: content.embedding,
      isActive: content.isActive,
    })
    .from(content)
    .where(eq(content.id, contentId))
    .limit(1)

  if (!item || !item.isActive || !item.embedding) {
    throw new AppError(400, "Content not found or inactive")
  }

  return item as ActiveContent
}

async function insertEvent(tx: Tx, data: CreateEventInput) {
  const [event] = await tx.insert(events).values(data).returning()
  return event
}

export async function createEvent(data: CreateEventInput) {
  const contentItem = await loadActiveContent(data.contentId)

  return db.transaction(async (tx) => {
    const event = await insertEvent(tx, data)
    const profile = await findOrCreateProfile(tx, data.userId)
    await updateUserPreferences(tx, {
      profile,
      contentEmbedding: contentItem.embedding,
      eventWeight: data.weight,
    })
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

  const [created] = await tx.insert(userProfiles).values({ externalUserId }).returning()
  return created
}

type PreferenceUpdate = { vector: number[]; totalWeight: number }
type Profile = typeof userProfiles.$inferSelect
type PreferenceArgs = { profile: Profile; contentEmbedding: number[]; eventWeight: number }

function initialUpdate(args: PreferenceArgs): PreferenceUpdate {
  return {
    vector: initialPreferenceVector(args.contentEmbedding, args.eventWeight),
    totalWeight: Math.abs(args.eventWeight),
  }
}

function incrementalUpdate(args: PreferenceArgs): PreferenceUpdate {
  const { profile, contentEmbedding, eventWeight } = args
  return {
    vector: updatePreferenceVector(profile.preferenceVector!, profile.totalWeight, contentEmbedding, eventWeight),
    totalWeight: profile.totalWeight + Math.abs(eventWeight),
  }
}

function computePreferenceUpdate(args: PreferenceArgs): PreferenceUpdate {
  return args.profile.preferenceVector ? incrementalUpdate(args) : initialUpdate(args)
}

async function updateUserPreferences(tx: Tx, args: PreferenceArgs) {
  const { profile } = args
  const { vector, totalWeight } = computePreferenceUpdate(args)
  await tx
    .update(userProfiles)
    .set({
      preferenceVector: vector,
      totalWeight,
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
