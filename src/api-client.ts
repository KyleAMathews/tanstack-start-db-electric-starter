import type { AppType } from "./routes/api/todos/$.ts"
import { hc } from "hono/client"

let _client: ReturnType<typeof hc<AppType>> | null = null

export function getClient() {
  if (typeof window === "undefined") {
    // throw new Error('getClient() called on the server');
  }
  if (!_client) {
    _client = hc<AppType>(
      typeof window !== `undefined` ? window?.location.origin : ``
    )
  }
  return _client
}
