import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

import { errorHandler } from "./lib/errors"
import { contentRoutes } from "./routes/content"
import { eventRoutes } from "./routes/events"
import { healthRoutes } from "./routes/health"
import { recommendationRoutes } from "./routes/recommendations"

export function createApp(options?: { basePath?: string }) {
  const base = options?.basePath ?? "/api/v1"
  const app = new Hono()

  app.use(logger())
  app.use(`${base}/*`, cors())
  app.onError(errorHandler)

  app.route(`${base}/health`, healthRoutes)
  app.route(`${base}/content`, contentRoutes)
  app.route(`${base}/events`, eventRoutes)
  app.route(`${base}/recommendations`, recommendationRoutes)

  return app
}
