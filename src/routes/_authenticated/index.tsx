import { createFileRoute } from "@tanstack/react-router"
import {
  useLiveQuery,
  createCollection,
  Query,
} from "@tanstack/react-db"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { type Todo } from "@/db/schema"
import { todoCollection } from "@/lib/collections"

export const Route = createFileRoute(`/_authenticated/`)({
  component: App,
  ssr: false,
  loader: async () => {
    await todoCollection.preload()

    return null

    // Use this once it's working.
    // const query = createLiveQueryCollection({ query: new Query().from({ todoCollection }) })
    //
    // await query.preload()
    // return query
    //
  },
})

function App() {
  const { data: session } = authClient.useSession()
  const [newTodoText, setNewTodoText] = useState("")
  // const query = Route.useLoaderData()
  // const { data: todos } = useLiveQuery({ query })
  const { data: todos } = useLiveQuery((q) => q.from({ todoCollection }))

  const addTodo = () => {
    if (newTodoText.trim()) {
      todoCollection.insert({
        user_id: session?.user.id!,
        id: Math.floor(Math.random() * 100000),
        text: newTodoText.trim(),
        completed: false,
        created_at: new Date(),
      })
      setNewTodoText("")
    }
  }

  const toggleTodo = (todo: Todo) => {
    todoCollection.update(todo.id, (draft) => {
      draft.completed = !draft.completed
    })
  }

  const deleteTodo = (id: number) => {
    todoCollection.delete(id)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Todo App
        </h1>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            placeholder="Add a new todo..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addTodo}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add
          </button>
        </div>

        <ul className="space-y-2">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center gap-2 p-2 border border-gray-200 rounded-md"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span
                className={`flex-1 ${
                  todo.completed
                    ? "line-through text-gray-500"
                    : "text-gray-800"
                }`}
              >
                {todo.text}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        {todos.length === 0 && (
          <p className="text-gray-500 text-center mt-4">
            No todos yet. Add one above!
          </p>
        )}
      </div>
    </div>
  )
}
