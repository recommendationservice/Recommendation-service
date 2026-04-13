import { handle } from "hono/vercel"

let handler: ((req: Request) => Response | Promise<Response>) | null = null

async function getHandler() {
  if (!handler) {
    const { createApp } = await import("recommendation-service")
    handler = handle(createApp({ basePath: "/reco" }))
  }
  return handler
}

const proxyRequest = async (req: Request) => (await getHandler())(req)

export { proxyRequest as GET, proxyRequest as POST, proxyRequest as PUT, proxyRequest as DELETE }
