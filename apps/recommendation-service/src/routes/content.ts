import { Hono } from "hono"

import { validate } from "../lib/errors"
import { createContentSchema, updateContentSchema, contentIdParam } from "../lib/schemas"
import * as contentService from "../services/content"

const contentRoutes = new Hono()

type ContentRow = Awaited<ReturnType<typeof contentService.createContent>>
type UpdatedContentRow = Awaited<ReturnType<typeof contentService.updateContent>>

function toContentDto(row: ContentRow) {
  return {
    id: row.id,
    externalId: row.externalId,
    type: row.type,
    metadata: row.metadata,
    isActive: row.isActive,
    createdAt: row.createdAt,
  }
}

function toUpdatedContentDto(row: UpdatedContentRow) {
  return { ...toContentDto(row), updatedAt: row.updatedAt }
}

contentRoutes.post("/", validate("json", createContentSchema), async (c) => {
  const data = c.req.valid("json")
  const result = await contentService.createContent(data)
  return c.json(toContentDto(result), 201)
})

contentRoutes.put(
  "/:id",
  validate("param", contentIdParam),
  validate("json", updateContentSchema),
  async (c) => {
    const { id } = c.req.valid("param")
    const data = c.req.valid("json")
    const result = await contentService.updateContent(id, data)
    return c.json(toUpdatedContentDto(result))
  },
)

contentRoutes.delete("/:id", validate("param", contentIdParam), async (c) => {
  const { id } = c.req.valid("param")
  const result = await contentService.softDeleteContent(id)
  return c.json(result)
})

export { contentRoutes }
