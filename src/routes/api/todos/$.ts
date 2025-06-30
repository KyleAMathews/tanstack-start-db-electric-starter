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

const app = new OpenAPIHono()

// Generate a transaction ID
async function generateTxId(tx): Promise<string> {
  const txidResult = await tx.execute(sql`SELECT txid_current() as txid`)
  return String(txidResult.rows[0].txid)
}

// POST /api/todos - Create a new todo
const createTodoRoute = createRoute({
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
})

app.openapi(createTodoRoute, async (c) => {
  const body = c.req.valid("json")

  const result = await db.transaction(async (tx) => {
    const txid = await generateTxId(tx)
    const [newTodo] = await tx.insert(todosTable).values(body).returning()
    return { todo: newTodo, txid }
  })

  return c.json(result, HttpStatusCodes.OK)
})

// // PUT /api/todos/:id - Update a todo
const updateTodoRoute = createRoute({
  method: "put",
  path: "/api/todos/{id}",
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
})

app.openapi(updateTodoRoute, async (c) => {
  const { id } = c.req.valid("param")
  const body = c.req.valid("json")

  const result = await db.transaction(async (tx) => {
    const txid = await generateTxId(tx)
    const [updatedTodo] = await db
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
})
//
// // DELETE /api/todos/:id - Delete a todo
const deleteTodoRoute = createRoute({
  method: "delete",
  path: "/api/todos/{id}",
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
})

app.openapi(deleteTodoRoute, async (c) => {
  const { id } = c.req.valid("param")

  const result = await db.transaction(async (tx) => {
    const txid = await generateTxId(tx)
    const [deletedTodo] = await db
      .delete(todosTable)
      .where(eq(todosTable.id, id))
      .returning()
    return { todo: deletedTodo, txid }
  })

  if (!result.todo) {
    return c.json({ error: "Todo not found" }, HttpStatusCodes.NOT_FOUND)
  }

  return c.json(result, HttpStatusCodes.OK)
})

const serve = ({ request }: { request: Request }) => {
  return app.fetch(request)
}

export const ServerRoute = createServerFileRoute("/api/todos/$").methods({
  GET: serve,
  POST: serve,
  PUT: serve,
  DELETE: serve,
  PATCH: serve,
  OPTIONS: serve,
  HEAD: serve,
})
