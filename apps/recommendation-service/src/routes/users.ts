import { Hono } from "hono"

import { validate } from "../lib/errors"
import { getScoreBreakdownParams, getScoreBreakdownQuery } from "../lib/schemas"
import * as userService from "../services/users"
import { getScoreBreakdown } from "../services/score-breakdown"

const userRoutes = new Hono()

userRoutes.delete("/:externalUserId", async (c) => {
  const externalUserId = c.req.param("externalUserId")
  await userService.resetUser(externalUserId)
  return c.body(null, 204)
})

userRoutes.get(
  "/:externalUserId/score-breakdown",
  validate("param", getScoreBreakdownParams),
  validate("query", getScoreBreakdownQuery),
  async (c) => {
    const { externalUserId } = c.req.valid("param")
    const { groupBy, limit } = c.req.valid("query")
    const result = await getScoreBreakdown({ userId: externalUserId, groupBy, limit })
    return c.json(result)
  },
)

export { userRoutes }
