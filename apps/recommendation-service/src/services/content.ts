import { eq } from "drizzle-orm"

import { db } from "../db/client"
import { content } from "../db/schema"
import { AppError } from "../lib/errors"
import { generateEmbedding } from "./embedding"

export async function createContent(data: {
  externalId: string
  type: string
  textForEmbedding: string
  metadata: Record<string, unknown>
}) {
  const embedding = await generateEmbedding(data.textForEmbedding)

  const [result] = await db
    .insert(content)
    .values({
      externalId: data.externalId,
      type: data.type,
      textForEmbedding: data.textForEmbedding,
      metadata: data.metadata,
      embedding,
    })
    .returning()

  return result
}

export async function updateContent(
  id: string,
  data: {
    externalId?: string
    type?: string
    textForEmbedding?: string
    metadata?: Record<string, unknown>
  },
) {
  const existing = await db
    .select()
    .from(content)
    .where(eq(content.id, id))
    .limit(1)

  if (existing.length === 0) {
    throw new AppError(404, "Content not found")
  }

  const updateData: Record<string, unknown> = {}
  if (data.externalId !== undefined) updateData.externalId = data.externalId
  if (data.type !== undefined) updateData.type = data.type
  if (data.textForEmbedding !== undefined) updateData.textForEmbedding = data.textForEmbedding
  if (data.metadata !== undefined) updateData.metadata = data.metadata

  if (data.textForEmbedding && data.textForEmbedding !== existing[0].textForEmbedding) {
    updateData.embedding = await generateEmbedding(data.textForEmbedding)
  }

  if (Object.keys(updateData).length === 0) {
    return existing[0]
  }

  const [result] = await db
    .update(content)
    .set(updateData)
    .where(eq(content.id, id))
    .returning()

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
