import {
  boolean,
  integer,
  pgTable,
  timestamp,
  varchar,
  text,
} from "drizzle-orm/pg-core"
import { createSchemaFactory } from "drizzle-zod"
import { z } from "@hono/zod-openapi"
export * from "./auth-schema"
import { users } from "./auth-schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } =
  createSchemaFactory({ zodInstance: z })

export const todosTable = pgTable(`todos`, {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  text: varchar({ length: 500 }).notNull(),
  completed: boolean().notNull().default(false),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const selectTodoSchema = createSelectSchema(todosTable)
export const createTodoSchema = createInsertSchema(todosTable)
  .omit({
    created_at: true,
  })
  .openapi(`CreateTodo`)
export const updateTodoSchema = createUpdateSchema(todosTable)

export type Todo = z.infer<typeof selectTodoSchema>
export type UpdateTodo = z.infer<typeof updateTodoSchema>
