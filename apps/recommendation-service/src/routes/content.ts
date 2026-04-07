import { Hono } from "hono"

import { validate } from "../lib/errors"
import { createContentSchema, updateContentSchema, contentIdParam } from "../lib/schemas"
import * as contentService from "../services/content"

const contentRoutes = new Hono()

contentRoutes.post("/", validate("json", createContentSchema), async (c) => {
  const data = c.req.valid("json")
  const result = await contentService.createContent(data)

  return c.json(
    {
      id: result.id,
      externalId: result.externalId,
      type: result.type,
      metadata: result.metadata,
      isActive: result.isActive,
      createdAt: result.createdAt,
    },
    201,
  )
})

contentRoutes.put(
  "/:id",
  validate("param", contentIdParam),
  validate("json", updateContentSchema),
  async (c) => {
    const { id } = c.req.valid("param")
    const data = c.req.valid("json")
    const result = await contentService.updateContent(id, data)

    return c.json({
      id: result.id,
      externalId: result.externalId,
      type: result.type,
      metadata: result.metadata,
      isActive: result.isActive,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    })
  },
)

contentRoutes.delete("/:id", validate("param", contentIdParam), async (c) => {
  const { id } = c.req.valid("param")
  const result = await contentService.softDeleteContent(id)
  return c.json(result)
})

export { contentRoutes }
