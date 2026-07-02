import type { QueryClient } from "@tanstack/react-query"

export function clearAuthQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: ["notifications"] })
  queryClient.removeQueries({ queryKey: ["agent-follow-ups"] })
  queryClient.removeQueries({ queryKey: ["agent-clients"] })
}
