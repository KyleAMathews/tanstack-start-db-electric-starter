import { createFileRoute } from "@tanstack/react-router"
import { useLiveQuery, eq } from "@tanstack/react-db"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { todoCollection, projectCollection } from "@/lib/collections"
import { type Todo } from "@/db/schema"

export const Route = createFileRoute("/_authenticated/project/$projectId")({
  component: ProjectPage,
  ssr: false,
  loader: async () => {
    await projectCollection.preload()
    await todoCollection.preload()
    return null
  },
})

function ProjectPage() {
  const { projectId } = Route.useParams()
  const { data: session } = authClient.useSession()
  const [newTodoText, setNewTodoText] = useState("")

  const { data: todos } = useLiveQuery(
    (q) =>
      q
        .from({ todoCollection })
        .where(({ todoCollection }) =>
          eq(todoCollection.project_id, parseInt(projectId, 10))
        )
        .orderBy(({ todoCollection }) => todoCollection.created_at),
    [projectId]
  )

  const { data: projects } = useLiveQuery((q) => q.from({ projectCollection }))
  const project = projects?.find((p) => p.id === parseInt(projectId))

  const addTodo = () => {
    if (newTodoText.trim() && session) {
      todoCollection.insert({
        user_id: session.user.id,
        id: Math.floor(Math.random() * 100000),
        text: newTodoText.trim(),
        completed: false,
        project_id: parseInt(projectId),
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

  if (!project) {
    return <div className="p-6">Project not found</div>
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <h1
          className="text-2xl font-bold text-gray-800 mb-2 cursor-pointer hover:bg-gray-50 p-0 rounded"
          onClick={() => {
            const newName = prompt("Edit project name:", project.name)
            if (newName && newName !== project.name) {
              projectCollection.update(project.id, (draft) => {
                draft.name = newName
              })
            }
          }}
        >
          {project.name}
        </h1>

        <p
          className="text-gray-600 mb-3 cursor-pointer hover:bg-gray-50 p-0 rounded min-h-[1.5rem]"
          onClick={() => {
            const newDescription = prompt(
              "Edit project description:",
              project.description || ""
            )
            if (newDescription !== null) {
              projectCollection.update(project.id, (draft) => {
                draft.description = newDescription
              })
            }
          }}
        >
          {project.description || "Click to add description..."}
        </p>

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
          {todos?.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-md shadow-sm"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span
                className={`flex-1 ${todo.completed
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

        {(!todos || todos.length === 0) && (
          <div className="text-center py-8">
            <p className="text-gray-500">No todos yet. Add one above!</p>
          </div>
        )}
      </div>
    </div>
  )
}
