"use server"

import axios from "axios"
import { cookies } from "next/headers"

export type CommercialExecutionStatus =
  | "APPELE"
  | "NON_REPONDU"
  | "COMMANDE_PRISE"
  | "A_RELANCER"

export interface AgentExecutionLog {
  id: number
  status: CommercialExecutionStatus
  comment: string | null
  orderTaken: boolean
  nextFollowUpAt: string | null
  createdAt: string
}

export interface AgentClient {
  id: string
  name: string
  address: string
  phone: string
  accountNumber: string
  status: "effectuer" | "en_attente"
  executionStatus: CommercialExecutionStatus | null
  latestComment: string | null
  nextFollowUpAt: string | null
  followUpDueState?: "due_today" | "overdue" | null
  orderTaken: boolean
  commercialBcStatus: "BROUILLON" | "CONFIRME" | "MODIFICATION_DEMANDEE" | "MODIFICATION_AUTORISEE" | "VALIDE_ADMIN" | "REJETE_ADMIN" | "ANNULE" | "FACTURE" | null
  commercialBcMessage: string | null
  commercialBcId: string | null
  recentLogs: AgentExecutionLog[]
  assignedDate?: string
  agentId?: string
  type?: "MAGASIN" | "INDIVIDUEL"
  parentName?: string | null
  instructions?: string | null
  canModify?: boolean
}

export interface AgentStats {
  totalClients: number
  completedClients: number
  pendingClients: number
  progress: {
    current: number
    total: number
  }
}

export interface AgentDailyData {
  day: string
  clients: AgentClient[]
  stats: AgentStats
}

export interface AgentProduct {
  id: number
  reference: string
  name: string
  price: number
}

export interface OrderLineInput {
  productId: number
  quantity: number
}

export interface SubmitExecutionInput {
  planningItemId: string
  status: CommercialExecutionStatus | "effectuer" | "en_attente"
  comment?: string
  nextFollowUpAt?: string
  orderTaken?: boolean
  orderLines?: OrderLineInput[]
}

export interface ActionResult {
  success: boolean
  message?: string
  executionLogId?: number
}

export interface AgentHistoryEntry {
  id: string
  planningItemId: number | null
  clientName: string
  clientAddress: string
  clientPhone: string
  clientCode: string
  parentName: string | null
  status: CommercialExecutionStatus
  comment: string | null
  orderTaken: boolean
  nextFollowUpAt: string | null
  resolvedFollowUpAt?: string | null
  followUpResolved?: boolean
  createdAt: string
  orderLines: Array<{
    id: number
    productId: number
    productName: string
    productReference: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
}

export interface AgentOrder {
  id: string
  numeroCommande: string
  clientId: string
  clientName: string
  clientAddress: string
  clientPhone: string
  clientCode: string
  parentName: string | null
  dateCommande: string
  heureCommande: string
  commentaire: string | null
  items: Array<{
    id: string
    productId: number
    product: string
    reference: string
    quantity: string
    unitPrice: number
    totalPrice: number
  }>
  sousTotal: number
  total: number
  statut: "en_preparation" | "en_cours_facturation" | "annulee"
  commercialBl: {
    id: string
    executionLogId: string
    status: "BROUILLON" | "CONFIRME" | "MODIFICATION_DEMANDEE" | "MODIFICATION_AUTORISEE" | "VALIDE_ADMIN" | "REJETE_ADMIN" | "ANNULE" | "FACTURE"
    productsSnapshot: Array<{
      productId: number
      productName?: string
      productReference?: string
      quantity: number
    }>
    comment: string | null
    confirmedAt: string | null
    editAuthorizedUntil: string | null
    latestRequest: {
      id: string
      status: "EN_ATTENTE" | "APPROUVEE" | "REFUSEE" | "UTILISEE" | "EXPIREE"
      reason: string
      responseNote: string | null
      authorizedUntil: string | null
    } | null
  } | null
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

function apiUrl(path: string) {
  return `${process.env.API_URL}${path}`
}

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined
    return data?.message || error.message || "Une erreur est survenue"
  }
  if (error instanceof Error) return error.message
  return "Une erreur est survenue"
}

export async function getAgentClients(day: string, agentId?: string): Promise<AgentClient[]> {
  try {
    const response = await axios.get(apiUrl("agent/clients"), {
      headers: await getAuthHeaders(),
      params: { day, agentId },
    })
    return response.data
  } catch (error) {
    console.error("Erreur lors de la récupération des clients:", error)
    return []
  }
}

export async function getAgentStats(day: string, agentId?: string): Promise<AgentStats> {
  try {
    const response = await axios.get(apiUrl("agent/stats"), {
      headers: await getAuthHeaders(),
      params: { day, agentId },
    })
    return response.data
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error)
    return {
      totalClients: 0,
      completedClients: 0,
      pendingClients: 0,
      progress: { current: 0, total: 0 },
    }
  }
}

export async function getAgentFollowUps(agentId?: string): Promise<AgentClient[]> {
  try {
    const response = await axios.get(apiUrl("agent/follow-ups"), {
      headers: await getAuthHeaders(),
      params: { agentId },
    })
    return response.data
  } catch (error) {
    console.error("Erreur lors de la récupération des relances:", error)
    return []
  }
}

export async function updateClientStatus(
  clientId: string,
  status: "effectuer" | "en_attente",
  agentId?: string
): Promise<ActionResult> {
  try {
    await axios.put(
      apiUrl(`agent/clients/${clientId}/status`),
      { status, agentId },
      { headers: await getAuthHeaders() }
    )
    return { success: true }
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut:", error)
    return { success: false, message: extractErrorMessage(error) }
  }
}

export async function submitClientExecution(input: SubmitExecutionInput): Promise<ActionResult> {
  try {
    const response = await axios.put(
      apiUrl(`agent/clients/${input.planningItemId}/status`),
      {
        status: input.status,
        comment: input.comment,
        nextFollowUpAt: input.nextFollowUpAt,
        orderTaken: input.orderTaken,
        orderLines: input.orderLines,
      },
      { headers: await getAuthHeaders() }
    )
    return {
      success: true,
      executionLogId: response.data.executionLogId,
    }
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de l'action:", error)
    return { success: false, message: extractErrorMessage(error) }
  }
}

export async function getAgentProducts(): Promise<AgentProduct[]> {
  try {
    const response = await axios.get(apiUrl("agent/products"), {
      headers: await getAuthHeaders(),
    })
    return response.data
  } catch (error) {
    console.error("Erreur lors de la récupération des produits:", error)
    return []
  }
}

export async function getAgentHistory(params?: {
  from?: string
  to?: string
  status?: string
  search?: string
}): Promise<AgentHistoryEntry[]> {
  try {
    const response = await axios.get(apiUrl("agent/history"), {
      headers: await getAuthHeaders(),
      params,
    })
    return response.data
  } catch (error) {
    console.error("Erreur lors de la récupération de l'historique:", error)
    return []
  }
}

export async function getAgentOrders(params?: {
  from?: string
  to?: string
  search?: string
}): Promise<AgentOrder[]> {
  try {
    const response = await axios.get(apiUrl("agent/orders"), {
      headers: await getAuthHeaders(),
      params,
    })
    return response.data
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes:", error)
    return []
  }
}

export async function getAgentDailyData(day: string, agentId?: string): Promise<AgentDailyData> {
  try {
    const [clients, stats] = await Promise.all([
      getAgentClients(day, agentId),
      getAgentStats(day, agentId),
    ])

    return { day, clients, stats }
  } catch (error) {
    console.error("Erreur lors de la récupération des données quotidiennes:", error)
    return {
      day,
      clients: [],
      stats: {
        totalClients: 0,
        completedClients: 0,
        pendingClients: 0,
        progress: { current: 0, total: 0 },
      },
    }
  }
}

export async function markClientAsCompleted(clientId: string, agentId?: string): Promise<ActionResult> {
  return updateClientStatus(clientId, "effectuer", agentId)
}

export async function markClientAsPending(clientId: string, agentId?: string): Promise<ActionResult> {
  return updateClientStatus(clientId, "en_attente", agentId)
}