import { createServerFileRoute } from "@tanstack/react-start/server"
import { OpenAPIHono } from "@hono/zod-openapi"
import { auth } from "@/lib/auth"
const routes = new OpenAPIHono()

routes.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw))

const serve = ({ request }: { request: Request }) => {
  return routes.fetch(request)
}

export const ServerRoute = createServerFileRoute("/api/auth").methods({
  GET: serve,
  POST: serve,
  PUT: serve,
  DELETE: serve,
  PATCH: serve,
  OPTIONS: serve,
  HEAD: serve,
})
