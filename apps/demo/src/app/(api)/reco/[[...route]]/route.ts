import { handle } from "hono/vercel"
import { createApp } from "recommendation-service"

const app = createApp({ basePath: "/reco" })

const proxyRequest = handle(app)

export { proxyRequest as GET, proxyRequest as POST, proxyRequest as PUT, proxyRequest as DELETE }
