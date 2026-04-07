import { serve } from "@hono/node-server"

import { createApp } from "./app"
import { sql } from "./db/client"

const DEFAULT_PORT = 3001

const app = createApp()
const port = Number(process.env.PORT) || DEFAULT_PORT

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Recommendation service running on http://localhost:${info.port}`)
})

const shutdown = async () => {
  console.log("Shutting down...")
  server.close()
  await sql.end()
  process.exit(0)
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)
