import { Hono } from "hono"

import { validate } from "../lib/errors"
import { getRecommendationsQuery } from "../lib/schemas"
import * as recoService from "../services/recommendations"

const recommendationRoutes = new Hono()

recommendationRoutes.get("/", validate("query", getRecommendationsQuery), async (c) => {
  const params = c.req.valid("query")
  const result = await recoService.getRecommendations(params)
  return c.json(result)
})

export { recommendationRoutes }
