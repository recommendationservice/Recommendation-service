import { eq } from "drizzle-orm"

import { db } from "../db/client"
import { content } from "../db/schema"
import { AppError } from "../lib/errors"
import { generateEmbedding } from "./embedding"

type CreateContentInput = {
  externalId: string
  type: string
  textForEmbedding: string
  metadata: Record<string, unknown>
}

type UpdateContentInput = {
  externalId?: string
  type?: string
  textForEmbedding?: string
  metadata?: Record<string, unknown>
}

export async function createContent(data: CreateContentInput) {
  const embedding = await generateEmbedding(data.textForEmbedding)

  const [result] = await db
    .insert(content)
    .values({ ...data, embedding })
    .returning()

  return result
}

async function findContentById(id: string) {
  const [existing] = await db.select().from(content).where(eq(content.id, id)).limit(1)
  if (!existing) {
    throw new AppError(404, "Content not found")
  }
  return existing
}

async function buildContentUpdatePatch(
  data: UpdateContentInput,
  existing: typeof content.$inferSelect,
): Promise<Record<string, unknown>> {
  const patch: Record<string, unknown> = {}
  if (data.externalId !== undefined) patch.externalId = data.externalId
  if (data.type !== undefined) patch.type = data.type
  if (data.textForEmbedding !== undefined) patch.textForEmbedding = data.textForEmbedding
  if (data.metadata !== undefined) patch.metadata = data.metadata

  if (data.textForEmbedding && data.textForEmbedding !== existing.textForEmbedding) {
    patch.embedding = await generateEmbedding(data.textForEmbedding)
  }

  return patch
}

export async function updateContent(id: string, data: UpdateContentInput) {
  const existing = await findContentById(id)
  const patch = await buildContentUpdatePatch(data, existing)

  if (Object.keys(patch).length === 0) {
    return existing
  }

  const [result] = await db.update(content).set(patch).where(eq(content.id, id)).returning()
  return result
}

export async function softDeleteContent(id: string) {
  const [result] = await db
    .update(content)
    .set({ isActive: false })
    .where(eq(content.id, id))
    .returning({ id: content.id, isActive: content.isActive })

  if (!result) {
    throw new AppError(404, "Content not found")
  }

  return result
}
