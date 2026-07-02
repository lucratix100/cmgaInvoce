import type { AgentClient, CommercialExecutionStatus } from "@/actions/agent-actions"

export const COMMERCIAL_DAYS = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"] as const

export function getTodayCommercialDay(): string {
  const days = ["DIMANCHE", "LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"]
  const today = days[new Date().getDay()]
  return today === "DIMANCHE" ? "LUNDI" : today
}

export const EXECUTION_STATUS_LABELS: Record<CommercialExecutionStatus, string> = {
  APPELE: "Non commandé",
  NON_REPONDU: "Non répondu",
  COMMANDE_PRISE: "Commande prise",
  A_RELANCER: "À relancer",
}

export const EXECUTION_STATUS_COLORS: Record<CommercialExecutionStatus, string> = {
  APPELE: "bg-emerald-100 text-emerald-800",
  NON_REPONDU: "bg-orange-100 text-orange-800",
  COMMANDE_PRISE: "bg-blue-100 text-blue-800",
  A_RELANCER: "bg-amber-100 text-amber-800",
}

export function getClientInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
}

export function avatarColorFromName(name: string) {
  const colors = [
    "bg-violet-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
  ]
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

export interface ClientGroup {
  key: string
  parentName: string | null
  clients: AgentClient[]
}

export function groupClientsByEnseigne(clients: AgentClient[]): ClientGroup[] {
  const groups = new Map<string, ClientGroup>()

  for (const client of clients) {
    const key = client.parentName || client.name
    const existing = groups.get(key)
    if (existing) {
      existing.clients.push(client)
    } else {
      groups.set(key, {
        key,
        parentName: client.parentName,
        clients: [client],
      })
    }
  }

  return Array.from(groups.values())
}
