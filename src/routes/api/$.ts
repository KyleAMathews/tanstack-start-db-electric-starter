import { createServerFileRoute } from "@tanstack/react-start/server"
import { OpenAPIHono } from "@hono/zod-openapi"
import { createCRUDRoutes } from "@/lib/createCRUDRoutes"
import {
  todosTable,
  selectTodoSchema,
  createTodoSchema,
  updateTodoSchema,
} from "@/db/schema"

const routes = [
  createCRUDRoutes({
    table: todosTable,
    schema: {
      select: selectTodoSchema,
      create: createTodoSchema,
      update: updateTodoSchema,
    },
    basePath: "/api/todos",
  }),
] as const
const app = new OpenAPIHono()

routes.forEach((route) => app.route(`/`, route))

const serve = ({ request }: { request: Request }) => {
  return app.fetch(request)
}

export type AppType = (typeof routes)[number]

export const ServerRoute = createServerFileRoute("/api/$").methods({
  GET: serve,
  POST: serve,
  PUT: serve,
  DELETE: serve,
  PATCH: serve,
  OPTIONS: serve,
  HEAD: serve,
})
