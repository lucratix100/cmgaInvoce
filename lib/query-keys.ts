import type { CommandeFilters } from "@/actions/commande-actions"
import type { FacturationBlFilters } from "@/actions/facturation-actions"

export const QUERY_REFETCH_INTERVAL = 60_000

export const activePageRefetchOptions = {
  refetchInterval: QUERY_REFETCH_INTERVAL,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const

export const queryKeys = {
  agentClients: (day: string) => ["agent-clients", day] as const,
  agentFollowUps: () => ["agent-follow-ups"] as const,
  commercialOrders: (filters?: CommandeFilters) => ["commercial-orders", filters || {}] as const,
  personalClients: () => ["personal-clients"] as const,
  adminCommercialBlReviews: (status?: string, search?: string) =>
    ["admin-commercial-bl-reviews", status || "CONFIRME", search || ""] as const,
  commercialBlRequests: (status = "EN_ATTENTE") => ["commercial-bl-requests", status] as const,
  commercialBlRequestHistory: () => ["commercial-bl-requests", "history"] as const,
  commercialTeamStats: (period: string, from?: string, to?: string) =>
    ["commercial-team-stats", period, from || "", to || ""] as const,
  facturationCommercialBls: (filters?: FacturationBlFilters) =>
    ["facturation-commercial-bls", filters || {}] as const,
  notifications: (userId: number) => ["notifications", userId] as const,
} as const
