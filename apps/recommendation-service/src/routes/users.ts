import { Hono, type Context } from "hono"

import { BootstrapEnrichmentError, errorBody, validate } from "../lib/errors"
import {
  bootstrapBody,
  bootstrapParams,
  bootstrapResponse,
  getScoreBreakdownParams,
  getScoreBreakdownQuery,
} from "../lib/schemas"
import * as userService from "../services/users"
import { getScoreBreakdown } from "../services/score-breakdown"
import { bootstrapUser } from "../services/bootstrap"

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

const ENRICHMENT_STATUS = {
  unparsable_json: 400,
  safety_blocked: 422,
  empty_after_filter: 422,
  quota_exceeded: 503,
} as const

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError"
}

function mapEnrichmentError(err: BootstrapEnrichmentError) {
  const status = ENRICHMENT_STATUS[err.code]
  const headers: Record<string, string> = {}
  if (err.code === "quota_exceeded") headers["Retry-After"] = "60"
  return { status, headers, body: errorBody(err.message) }
}

function respondToBootstrapError(c: Context, err: unknown) {
  if (err instanceof BootstrapEnrichmentError) {
    const mapped = mapEnrichmentError(err)
    return c.json(mapped.body, mapped.status, mapped.headers)
  }
  if (isAbortError(err)) return c.json(errorBody("AI temporarily unavailable"), 503)
  console.error("[bootstrap] unhandled", err)
  return c.json(errorBody("Internal Server Error"), 500)
}

userRoutes.post(
  "/:externalUserId/bootstrap",
  validate("param", bootstrapParams),
  validate("json", bootstrapBody),
  async (c) => {
    const { externalUserId } = c.req.valid("param")
    const { rawPrompt } = c.req.valid("json")
    try {
      const result = await bootstrapUser({ externalUserId, rawPrompt })
      return c.json(bootstrapResponse.parse(result))
    } catch (err) {
      return respondToBootstrapError(c, err)
    }
  },
)

export { userRoutes }
