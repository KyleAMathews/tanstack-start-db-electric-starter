import { createServerFileRoute } from "@tanstack/react-start/server"
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { db } from "@/db/connection"
import {
  todosTable,
  selectTodoSchema,
  createTodoSchema,
  updateTodoSchema,
} from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import * as HttpStatusCodes from "stoker/http-status-codes"
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers"
import createMessageObjectSchema from "stoker/openapi/schemas/create-message-object"
import * as HttpStatusPhrases from "stoker/http-status-phrases"
import { createErrorSchema } from "stoker/openapi/schemas"
import IdParamsSchema from "stoker/openapi/schemas/id-params"

// Generate a transaction ID
async function generateTxId(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
): Promise<string> {
  const txidResult = await tx.execute(sql`SELECT txid_current() as txid`)
  return String(txidResult.rows[0].txid)
}

const routes = new OpenAPIHono()
  .openapi(
    // POST /api/todos - Create a new todo
    createRoute({
      path: "/api/todos",
      method: "get",
      responses: {
        [HttpStatusCodes.OK]: {
          description: `shape response`,
        },
      },
    }),
    async (c) => {
      const url = new URL(c.req.raw.url)

      // Construct the upstream URL
      const originUrl = new URL(`http://localhost:3000/v1/shape`)

      // Copy over the relevant query params that the Electric client adds
      // so that we return the right part of the Shape log.
      url.searchParams.forEach((value, key) => {
        if ([`live`, `table`, `handle`, `offset`, `cursor`].includes(key)) {
          originUrl.searchParams.set(key, value)
        }
      })

      const response = await fetch(originUrl)

      // Fetch decompresses the body but doesn't remove the
      // content-encoding & content-length headers which would
      // break decoding in the browser.
      //
      // See https://github.com/whatwg/fetch/issues/1729
      const headers = new Headers(response.headers)
      headers.delete(`content-encoding`)
      headers.delete(`content-length`)

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    }
  )
  .openapi(
    // POST /api/todos - Create a new todo
    createRoute({
      path: "/api/todos",
      method: "post",
      request: {
        body: jsonContentRequired(createTodoSchema, "The todo to create"),
      },
      responses: {
        [HttpStatusCodes.OK]: jsonContent(
          z.object({
            txid: z.string(),
            todo: selectTodoSchema,
          }),
          "The created todo"
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
          createErrorSchema(createTodoSchema),
          "The validation error(s)"
        ),
      },
    }),
    async (c) => {
      const body = c.req.valid("json")

      const result = await db.transaction(async (tx) => {
        const txid = await generateTxId(tx)
        const [newTodo] = await tx.insert(todosTable).values(body).returning()
        return { todo: newTodo, txid }
      })

      return c.json(result, HttpStatusCodes.OK)
    }
  )
  .openapi(
    // PUT /api/todos/:id - Update a todo
    createRoute({
      path: "/api/todos/{id}",
      method: "put",
      request: {
        params: IdParamsSchema,
        body: jsonContentRequired(updateTodoSchema, "The todo to update"),
      },
      responses: {
        [HttpStatusCodes.OK]: jsonContent(
          z.object({
            txid: z.string(),
            todo: selectTodoSchema,
          }),
          "The created todo"
        ),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(
          createMessageObjectSchema(HttpStatusPhrases.NOT_FOUND),
          HttpStatusPhrases.NOT_FOUND
        ),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
          createErrorSchema(createTodoSchema),
          "The validation error(s)"
        ),
      },
    }),
    async (c) => {
      const { id } = c.req.valid("param")
      const body = c.req.valid("json")

      const result = await db.transaction(async (tx) => {
        const txid = await generateTxId(tx)
        const [updatedTodo] = await tx
          .update(todosTable)
          .set(body)
          .where(eq(todosTable.id, id))
          .returning()
        return { todo: updatedTodo, txid }
      })

      if (!result.todo) {
        return c.json({ message: "Todo not found" }, HttpStatusCodes.NOT_FOUND)
      } else {
        return c.json(result, HttpStatusCodes.OK)
      }
    }
  )
  .openapi(
    // DELETE /api/todos/:id - Delete a todo
    createRoute({
      path: "/api/todos/{id}",
      method: "delete",
      request: {
        params: IdParamsSchema,
      },
      responses: {
        [HttpStatusCodes.OK]: jsonContent(
          z.object({
            txid: z.string(),
            todo: selectTodoSchema,
          }),
          "The created todo"
        ),
        [HttpStatusCodes.NOT_FOUND]: {
          description: "Todo not found",
        },
      },
    }),
    async (c) => {
      const { id } = c.req.valid("param")

      const result = await db.transaction(async (tx) => {
        const txid = await generateTxId(tx)
        const [deletedTodo] = await tx
          .delete(todosTable)
          .where(eq(todosTable.id, id))
          .returning()
        return { todo: deletedTodo, txid }
      })

      if (!result.todo) {
        return c.json({ error: "Todo not found" }, HttpStatusCodes.NOT_FOUND)
      }

      return c.json(result, HttpStatusCodes.OK)
    }
  )

const serve = ({ request }: { request: Request }) => {
  return routes.fetch(request)
}

export type AppType = typeof routes

export const ServerRoute = createServerFileRoute("/api/todos/$").methods({
  GET: serve,
  POST: serve,
  PUT: serve,
  DELETE: serve,
  PATCH: serve,
  OPTIONS: serve,
  HEAD: serve,
})
