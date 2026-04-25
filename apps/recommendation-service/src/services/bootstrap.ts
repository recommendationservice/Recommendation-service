import { eq, sql } from "drizzle-orm"

import { db } from "../db/client"
import { userProfiles } from "../db/schema"

import { generateEmbedding } from "./embedding"
import { enrichPrompt, type EnrichedData } from "./gemini"
import type { Tx } from "./events"

const DEDUP_WINDOW_MS = 5_000

export type BootstrapInput = {
  externalUserId: string
  rawPrompt?: string
}

export type BootstrapOutput = {
  preferenceVectorSet: boolean
  enrichedText?: string
}

function synthesizeCanonicalText(enriched: EnrichedData): string {
  const genres = enriched.genres.join(", ")
  const themes = enriched.themes.join(", ")
  const moods = enriched.moods.join(", ")
  const titles = enriched.sample_titles.join(", ")
  return `A user enjoys ${genres}. Themes: ${themes}. Mood: ${moods}. Similar in taste to films like ${titles}.`
}

type RecentProfile = {
  preferenceVector: number[] | null
  updatedAt: Date | null
}

async function findRecentProfile(externalUserId: string): Promise<RecentProfile | null> {
  const rows = await db
    .select({
      preferenceVector: userProfiles.preferenceVector,
      updatedAt: userProfiles.lastActiveAt,
    })
    .from(userProfiles)
    .where(eq(userProfiles.externalUserId, externalUserId))
    .limit(1)
  return rows[0] ?? null
}

function isWithinDedupWindow(updatedAt: Date | null): boolean {
  if (!updatedAt) return false
  return Date.now() - updatedAt.getTime() < DEDUP_WINDOW_MS
}

async function shouldShortCircuit(externalUserId: string): Promise<boolean> {
  const recent = await findRecentProfile(externalUserId)
  if (!recent) return false
  if (!recent.preferenceVector) return false
  return isWithinDedupWindow(recent.updatedAt)
}

async function persistVector(externalUserId: string, vector: number[]): Promise<void> {
  await db.transaction(async (tx) => {
    await (tx as Tx)
      .update(userProfiles)
      .set({ preferenceVector: vector, lastActiveAt: sql`now()` })
      .where(eq(userProfiles.externalUserId, externalUserId))
  })
}

async function runLlmPath(input: { externalUserId: string; rawPrompt: string }): Promise<BootstrapOutput> {
  if (await shouldShortCircuit(input.externalUserId)) {
    return { preferenceVectorSet: true }
  }
  const enriched = await enrichPrompt(input.rawPrompt)
  const canonicalText = synthesizeCanonicalText(enriched)
  const vector = await generateEmbedding(canonicalText)
  await persistVector(input.externalUserId, vector)
  return { preferenceVectorSet: true, enrichedText: canonicalText }
}

export async function bootstrapUser(input: BootstrapInput): Promise<BootstrapOutput> {
  if (input.rawPrompt === undefined) return { preferenceVectorSet: false }
  return runLlmPath({ externalUserId: input.externalUserId, rawPrompt: input.rawPrompt })
}
