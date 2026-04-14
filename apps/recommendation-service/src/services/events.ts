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

export type Tx = PgTransaction<
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
    await upsertViewHistoryBatch(tx, profile.id, [data.contentId])
    return event
  })
}

export async function findOrCreateProfile(tx: Tx, externalUserId: string) {
  // Upsert with ON CONFLICT serves dual purpose: creates row if missing,
  // and acquires a per-user row lock held until transaction commit. This
  // serializes all per-user reco operations (GET writeback + createEvent)
  // preventing lost-update and view_history dedup races.
  const [row] = await tx
    .insert(userProfiles)
    .values({ externalUserId })
    .onConflictDoUpdate({
      target: userProfiles.externalUserId,
      set: { lastActiveAt: sql`now()` },
    })
    .returning()
  return row
}

type PreferenceUpdate = { vector: number[]; totalWeight: number }
export type Profile = typeof userProfiles.$inferSelect
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
      lastActiveAt: new Date(),
    })
    .where(eq(userProfiles.id, profile.id))
}

export async function upsertViewHistoryBatch(
  tx: Tx,
  profileId: string,
  contentIds: string[],
) {
  if (contentIds.length === 0) return
  await tx
    .insert(viewHistory)
    .values(contentIds.map((contentId) => ({ userId: profileId, contentId })))
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
