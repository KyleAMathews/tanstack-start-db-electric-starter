import { createServerFileRoute } from "@tanstack/react-start/server"
import { OpenAPIHono } from "@hono/zod-openapi"
import { createCRUDRoutes } from "@/lib/createCRUDRoutes"
import {
  todosTable,
  selectTodoSchema,
  createTodoSchema,
  updateTodoSchema,
  projectsTable,
  selectProjectSchema,
  createProjectSchema,
  updateProjectSchema,
} from "@/db/schema"
import { eq } from "drizzle-orm"

const routes = [
  createCRUDRoutes({
    table: projectsTable,
    schema: {
      select: selectProjectSchema,
      create: createProjectSchema,
      update: updateProjectSchema,
    },
    basePath: "/api/projects",
    syncFilter: (session) =>
      `owner_id = '${session.user.id}' OR '${session.user.id}' = ANY(shared_user_ids)`,
    access: {
      create: (session, data) => data.owner_id === session.user.id,
      update: (session, _id, _data) =>
        eq(projectsTable.owner_id, session.user.id),
      delete: (session, _id) => eq(projectsTable.owner_id, session.user.id),
    },
  }),
  createCRUDRoutes({
    table: todosTable,
    schema: {
      select: selectTodoSchema,
      create: createTodoSchema,
      update: updateTodoSchema,
    },
    basePath: "/api/todos",
    syncFilter: (session) => `user_id = '${session.user.id}'`,
    access: {
      create: (_session, _data) => true,
      update: (session, _id, _data) => eq(todosTable.user_id, session.user.id),
      delete: (session, _id) => eq(todosTable.user_id, session.user.id),
    },
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
