import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

import { errorHandler } from "./lib/errors"
import { contentRoutes } from "./routes/content"
import { eventRoutes } from "./routes/events"
import { healthRoutes } from "./routes/health"
import { recommendationRoutes } from "./routes/recommendations"

export function createApp() {
  const app = new Hono()

  app.use(logger())
  app.use("/api/*", cors())
  app.onError(errorHandler)

  app.route("/api/v1/health", healthRoutes)
  app.route("/api/v1/content", contentRoutes)
  app.route("/api/v1/events", eventRoutes)
  app.route("/api/v1/recommendations", recommendationRoutes)

  return app
}
