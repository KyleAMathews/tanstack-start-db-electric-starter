import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { db } from "@/db/connection"
import { eq, sql } from "drizzle-orm"
import * as HttpStatusCodes from "stoker/http-status-codes"
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers"
import createMessageObjectSchema from "stoker/openapi/schemas/create-message-object"
import * as HttpStatusPhrases from "stoker/http-status-phrases"
import { createErrorSchema } from "stoker/openapi/schemas"
import IdParamsSchema from "stoker/openapi/schemas/id-params"

async function generateTxId(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
): Promise<string> {
  const txidResult = await tx.execute(sql`SELECT txid_current() as txid`)
  return String(txidResult.rows[0].txid)
}

interface CRUDConfig {
  table: any
  schema: {
    select: z.ZodSchema
    create: z.ZodSchema
    update: z.ZodSchema
  }
  basePath: string
  syncFilter?: (session: any) => string
}

export function createCRUDRoutes(config: CRUDConfig) {
  const { table, schema, basePath } = config

  return new OpenAPIHono()
    .openapi(
      createRoute({
        path: basePath,
        method: "get",
        responses: {
          [HttpStatusCodes.OK]: {
            description: `shape response`,
          },
        },
      }),
      async (c) => {
        const url = new URL(c.req.raw.url)
        const originUrl = new URL(`http://localhost:3000/v1/shape`)

        url.searchParams.forEach((value, key) => {
          if ([`live`, `table`, `handle`, `offset`, `cursor`].includes(key)) {
            originUrl.searchParams.set(key, value)
          }
        })

        const response = await fetch(originUrl)
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
      createRoute({
        path: basePath,
        method: "post",
        request: {
          body: jsonContentRequired(schema.create, "The item to create"),
        },
        responses: {
          [HttpStatusCodes.OK]: jsonContent(
            z.object({
              txid: z.string(),
              item: schema.select,
            }),
            "The created item"
          ),
          [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(schema.create),
            "The validation error(s)"
          ),
        },
      }),
      async (c) => {
        const body = c.req.valid("json")

        const result = await db.transaction(async (tx) => {
          const txid = await generateTxId(tx)
          const [newItem] = await tx.insert(table).values(body).returning()
          return { item: newItem, txid }
        })

        return c.json(result, HttpStatusCodes.OK)
      }
    )
    .openapi(
      createRoute({
        path: `${basePath}/{id}`,
        method: "put",
        request: {
          params: IdParamsSchema,
          body: jsonContentRequired(schema.update, "The item to update"),
        },
        responses: {
          [HttpStatusCodes.OK]: jsonContent(
            z.object({
              txid: z.string(),
              item: schema.select,
            }),
            "The updated item"
          ),
          [HttpStatusCodes.NOT_FOUND]: jsonContent(
            createMessageObjectSchema(HttpStatusPhrases.NOT_FOUND),
            HttpStatusPhrases.NOT_FOUND
          ),
          [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(schema.update),
            "The validation error(s)"
          ),
        },
      }),
      async (c) => {
        const { id } = c.req.valid("param")
        const body = c.req.valid("json")

        const result = await db.transaction(async (tx) => {
          const txid = await generateTxId(tx)
          const [updatedItem] = await tx
            .update(table)
            .set(body)
            .where(eq(table.id, id))
            .returning()
          return { item: updatedItem, txid }
        })

        if (!result.item) {
          return c.json(
            { message: "Item not found" },
            HttpStatusCodes.NOT_FOUND
          )
        } else {
          return c.json(result, HttpStatusCodes.OK)
        }
      }
    )
    .openapi(
      createRoute({
        path: `${basePath}/{id}`,
        method: "delete",
        request: {
          params: IdParamsSchema,
        },
        responses: {
          [HttpStatusCodes.OK]: jsonContent(
            z.object({
              txid: z.string(),
              item: schema.select,
            }),
            "The deleted item"
          ),
          [HttpStatusCodes.NOT_FOUND]: {
            description: "Item not found",
          },
        },
      }),
      async (c) => {
        const { id } = c.req.valid("param")

        const result = await db.transaction(async (tx) => {
          const txid = await generateTxId(tx)
          const [deletedItem] = await tx
            .delete(table)
            .where(eq(table.id, id))
            .returning()
          return { item: deletedItem, txid }
        })

        if (!result.item) {
          return c.json({ error: "Item not found" }, HttpStatusCodes.NOT_FOUND)
        }

        return c.json(result, HttpStatusCodes.OK)
      }
    )
}

