import { Hono } from "hono"

import { validate } from "../lib/errors"
import { createEventSchema, getEventsQuery } from "../lib/schemas"
import * as eventService from "../services/events"

const eventRoutes = new Hono()

eventRoutes.post("/", validate("json", createEventSchema), async (c) => {
  const data = c.req.valid("json")
  const event = await eventService.createEvent(data)

  return c.json(
    {
      id: event.id,
      userId: event.userId,
      contentId: event.contentId,
      eventType: event.eventType,
      weight: event.weight,
      createdAt: event.createdAt,
    },
    201,
  )
})

eventRoutes.get("/", validate("query", getEventsQuery), async (c) => {
  const { userId } = c.req.valid("query")
  const userEvents = await eventService.getEventsByUser(userId)

  return c.json({
    events: userEvents.map((e) => ({
      id: e.id,
      userId: e.userId,
      contentId: e.contentId,
      eventType: e.eventType,
      weight: e.weight,
      metadata: e.metadata,
      createdAt: e.createdAt,
    })),
  })
})

export { eventRoutes }
