"use server"

import axios from "axios"
import { cookies } from "next/headers"
import type { AgentHistoryEntry, CommercialExecutionStatus } from "@/actions/agent-actions"

export interface HistoriqueEntry {
  id: string
  clientId: string
  clientName: string
  parentName: string | null
  action: CommercialExecutionStatus
  followUpResolved?: boolean
  date: string
  time: string
  details: {
    products?: Array<{
      product: string
      reference: string
      quantity: number
      unitPrice: number
      totalPrice: number
    }>
    recallDate?: string
    resolvedFollowUpAt?: string
    comment?: string
  }
}

export interface HistoriqueStats {
  total: number
  totalProducts: number
  clientsTouched: number
  responseRate: number
  followUpsResolved?: number
  byAction: Record<CommercialExecutionStatus, number>
  monthlyTrend?: {
    currentMonth: number
    previousMonth: number
    difference: number
    percent: number
    direction: "up" | "down" | "stable"
  }
}

export interface HistoriqueFilters {
  dateFrom?: string
  dateTo?: string
  action?: string
  client?: string
}

async function getAuthHeaders() {
  const cookieStore = await cookies()
  const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  }
}

function mapHistoryEntry(entry: AgentHistoryEntry): HistoriqueEntry {
  const createdAt = entry.createdAt ? new Date(entry.createdAt) : new Date()
  const safeDate = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt
  const orderLines = Array.isArray(entry.orderLines) ? entry.orderLines : []

  return {
    id: entry.id,
    clientId: String(entry.planningItemId || ""),
    clientName: entry.clientName,
    parentName: entry.parentName,
    action: entry.status,
    followUpResolved: entry.followUpResolved,
    date: safeDate.toISOString().split("T")[0],
    time: safeDate.toTimeString().slice(0, 5),
    details: {
      products: orderLines.map((line) => ({
        product: line.productName,
        reference: line.productReference,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        totalPrice: line.totalPrice,
      })),
      recallDate: entry.nextFollowUpAt || undefined,
      resolvedFollowUpAt: entry.resolvedFollowUpAt || undefined,
      comment: entry.comment || undefined,
    },
  }
}

export async function getHistoriqueData(filters?: HistoriqueFilters): Promise<HistoriqueEntry[]> {
  try {
    const response = await axios.get(`${process.env.API_URL}agent/history`, {
      headers: await getAuthHeaders(),
      params: {
        from: filters?.dateFrom,
        to: filters?.dateTo,
        status: filters?.action,
        search: filters?.client,
      },
    })

    if (!Array.isArray(response.data)) {
      return []
    }

    return (response.data as AgentHistoryEntry[]).map(mapHistoryEntry)
  } catch (error) {
    console.error("Erreur lors de la récupération de l'historique:", error)
    return []
  }
}

export async function getHistoriqueStats(filters?: HistoriqueFilters): Promise<HistoriqueStats> {
  try {
    const response = await axios.get(`${process.env.API_URL}agent/history/stats`, {
      headers: await getAuthHeaders(),
      params: {
        from: filters?.dateFrom,
        to: filters?.dateTo,
        status: filters?.action,
        search: filters?.client,
      },
    })

    return response.data
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques historique:", error)
    return {
      total: 0,
      totalProducts: 0,
      clientsTouched: 0,
      responseRate: 0,
      followUpsResolved: 0,
      byAction: {
        APPELE: 0,
        NON_REPONDU: 0,
        COMMANDE_PRISE: 0,
        A_RELANCER: 0,
      },
      monthlyTrend: {
        currentMonth: 0,
        previousMonth: 0,
        difference: 0,
        percent: 0,
        direction: "stable",
      },
    }
  }
}

export async function exportHistorique(filters?: HistoriqueFilters): Promise<void> {
  const entries = await getHistoriqueData(filters)
  const header = ["Date", "Heure", "Client", "Enseigne", "Action", "Commentaire"]
  const rows = entries.map((e) => [
    e.date,
    e.time,
    e.clientName,
    e.parentName || "",
    e.action,
    e.details.comment || "",
  ])
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
  console.log("Export CSV historique:\n", csv)
}
