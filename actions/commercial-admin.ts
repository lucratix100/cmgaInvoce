"use server"

import axios from "axios"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import {
  CommercialAssignment,
  CommercialAgentHistoryEntry,
  CommercialClient,
  CommercialClientLocation,
  CommercialDashboardData,
  CommercialImportRow,
  CommercialPlanningItem,
  CommercialProduct,
  CommercialTeamStatsData,
  CommercialTeamStatsParams,
  CommercialTeamStatsPeriod,
  CommercialUser,
} from "@/types/commercial"

type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
}

export interface CommercialBlEditRequest {
  id: string
  commercialBlId: string
  status: string
  reason: string
  responseNote: string | null
  beforeSnapshot: Array<{
    productId: number
    productName?: string
    productReference?: string
    quantity: number
  }>
  afterSnapshot: Array<{
    productId: number
    productName?: string
    productReference?: string
    quantity: number
  }>
  createdAt: string
  updatedAt: string | null
  authorizedAt: string | null
  usedAt: string | null
  requester: {
    id: string
    name: string
    role: string
  } | null
  reviewer: {
    id: string
    name: string
    role: string
  } | null
  order: {
    id: string
    numeroCommande: string
    clientName: string
    parentName: string | null
  } | null
}

export type AdminCommercialBlReviewStatus = "CONFIRME" | "VALIDE_ADMIN" | "REJETE_ADMIN" | "FACTURE"

export interface AdminCommercialBlReview {
  id: string
  executionLogId: string
  numeroCommande: string
  status: AdminCommercialBlReviewStatus
  confirmedAt: string | null
  adminReviewedAt: string | null
  adminReviewComment: string | null
  clientName: string
  clientAccountNumber: string
  parentName: string | null
  agentName: string
  agentId: string | null
  products: Array<{
    productId: number
    productName: string
    productReference: string
    quantity: number
  }>
  reviewer: string | null
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

async function handleMutation<T>(request: Promise<{ data: T }>, path = "/commercial-dashboard") {
  try {
    const response = await request
    revalidatePath(path)
    return { success: true, data: response.data } as ApiResponse<T>
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || "Une erreur est survenue",
    }
  }
}

export async function getCommercialDashboard(): Promise<CommercialDashboardData | null> {
  try {
    const response = await axios.get(apiUrl("commercial-admin/dashboard"), {
      headers: await getAuthHeaders(),
    })
    return response.data
  } catch (error) {
    console.error("Erreur dashboard commercial:", error)
    return null
  }
}

export async function getCommercialTeamStats(
  params: CommercialTeamStatsParams = { period: "7d" }
): Promise<CommercialTeamStatsData | null> {
  try {
    const { period = "7d", from, to } = params
    const response = await axios.get(apiUrl("commercial-admin/team-stats"), {
      headers: await getAuthHeaders(),
      params: from ? { from, to, period: "custom" } : { period },
    })
    return response.data
  } catch (error) {
    console.error("Erreur stats équipe commercial:", error)
    return null
  }
}

export async function getCommercialBlEditRequests(): Promise<CommercialBlEditRequest[]> {
  try {
    const response = await axios.get(apiUrl("commercial-admin/commercial-bl-requests"), {
      headers: await getAuthHeaders(),
      params: { status: "EN_ATTENTE" },
    })
    return response.data || []
  } catch (error) {
    console.error("Erreur chargement demandes BC:", error)
    return []
  }
}

export async function getCommercialBlEditRequestHistory(): Promise<CommercialBlEditRequest[]> {
  try {
    const response = await axios.get(apiUrl("commercial-admin/commercial-bl-requests"), {
      headers: await getAuthHeaders(),
      params: { status: "history" },
    })
    return response.data || []
  } catch (error) {
    console.error("Erreur chargement historique demandes BC:", error)
    return []
  }
}

export async function reviewCommercialBlEditRequest(
  id: string,
  decision: "APPROUVER" | "REFUSER",
  note?: string
) {
  return handleMutation(
    axios.patch(
      apiUrl(`commercial-admin/commercial-bl-requests/${id}/review`),
      { decision, note },
      { headers: await getAuthHeaders() }
    ),
    "/commercial-dashboard/demandes-bl"
  )
}

export async function getAdminCommercialBlReviews(
  params?: { status?: string; search?: string },
  options?: { throwOnError?: boolean }
): Promise<AdminCommercialBlReview[]> {
  try {
    const response = await axios.get(apiUrl("admin/commercial-bl-reviews"), {
      headers: await getAuthHeaders(),
      params,
    })
    return response.data || []
  } catch (error) {
    if (options?.throwOnError) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.response?.data?.error || "Erreur chargement validation BC ADMIN"
        : "Erreur chargement validation BC ADMIN"
      throw new Error(message)
    }
    console.error("Erreur chargement validation BC ADMIN:", error)
    return []
  }
}

export async function reviewAdminCommercialBl(
  id: string,
  decision: "VALIDER" | "REJETER",
  note?: string
) {
  return handleMutation(
    axios.patch(
      apiUrl(`admin/commercial-bl-reviews/${id}/review`),
      { decision, note },
      { headers: await getAuthHeaders() }
    ),
    "/dashboard/commercial-bls"
  )
}

export async function getCommercialAgents(): Promise<CommercialUser[]> {
  try {
    const response = await axios.get(apiUrl("commercial-admin/agents"), {
      headers: await getAuthHeaders(),
    })
    return response.data || []
  } catch (error) {
    console.error("Erreur chargement commerciaux:", error)
    return []
  }
}

export async function createCommercialAgent(data: any) {
  return handleMutation(
    axios.post(
      apiUrl("commercial-admin/agents"),
      { ...data, role: "AGENT_COMMERCIAL", depotId: null },
      { headers: await getAuthHeaders() }
    ),
    "/commercial-dashboard/users"
  )
}

export async function updateCommercialAgent(id: number, data: any) {
  return handleMutation(
    axios.put(
      apiUrl(`commercial-admin/agents/${id}`),
      { ...data, role: "AGENT_COMMERCIAL", depotId: null },
      { headers: await getAuthHeaders() }
    ),
    "/commercial-dashboard/users"
  )
}

export async function deactivateCommercialAgent(id: number) {
  return handleMutation(
    axios.patch(apiUrl(`commercial-admin/agents/${id}/deactivate`), {}, { headers: await getAuthHeaders() }),
    "/commercial-dashboard/users"
  )
}

export async function getCommercialClients(params?: { search?: string; type?: string; includeInactive?: boolean }) {
  try {
    const response = await axios.get<CommercialClient[]>(apiUrl("commercial-admin/clients"), {
      headers: await getAuthHeaders(),
      params,
    })
    return response.data || []
  } catch (error) {
    console.error("Erreur chargement clients commerciaux:", error)
    return []
  }
}

export async function createCommercialClient(data: Partial<CommercialClient>) {
  return handleMutation(
    axios.post(apiUrl("commercial-admin/clients"), data, { headers: await getAuthHeaders() }),
    "/commercial-dashboard/affectations"
  )
}

export async function updateCommercialClient(id: number, data: Partial<CommercialClient>) {
  return handleMutation(
    axios.put(apiUrl(`commercial-admin/clients/${id}`), data, { headers: await getAuthHeaders() }),
    "/commercial-dashboard/affectations"
  )
}

export async function deactivateCommercialClient(id: number) {
  return handleMutation(
    axios.patch(apiUrl(`commercial-admin/clients/${id}/deactivate`), {}, { headers: await getAuthHeaders() }),
    "/commercial-dashboard/affectations"
  )
}

export async function activateCommercialClient(id: number) {
  return handleMutation(
    axios.patch(apiUrl(`commercial-admin/clients/${id}/activate`), {}, { headers: await getAuthHeaders() }),
    "/commercial-dashboard/affectations"
  )
}

export async function createCommercialLocation(data: Partial<CommercialClientLocation>) {
  return handleMutation(
    axios.post(apiUrl("commercial-admin/locations"), data, { headers: await getAuthHeaders() }),
    "/commercial-dashboard/affectations"
  )
}

export async function updateCommercialLocation(id: number, data: Partial<CommercialClientLocation>) {
  return handleMutation(
    axios.put(apiUrl(`commercial-admin/locations/${id}`), data, { headers: await getAuthHeaders() }),
    "/commercial-dashboard/affectations"
  )
}

export async function deactivateCommercialLocation(id: number) {
  return handleMutation(
    axios.patch(apiUrl(`commercial-admin/locations/${id}/deactivate`), {}, { headers: await getAuthHeaders() }),
    "/commercial-dashboard/affectations"
  )
}

export async function activateCommercialLocation(id: number) {
  return handleMutation(
    axios.patch(apiUrl(`commercial-admin/locations/${id}/activate`), {}, { headers: await getAuthHeaders() }),
    "/commercial-dashboard/affectations"
  )
}

export async function getCommercialAssignments(): Promise<CommercialAssignment[]> {
  try {
    const response = await axios.get(apiUrl("commercial-admin/assignments"), {
      headers: await getAuthHeaders(),
    })
    return response.data || []
  } catch (error) {
    console.error("Erreur chargement affectations:", error)
    return []
  }
}

export async function createCommercialAssignment(data: Partial<CommercialAssignment>) {
  const result = await handleMutation(
    axios.post(apiUrl("commercial-admin/assignments"), data, { headers: await getAuthHeaders() }),
    "/commercial-dashboard/affectations"
  )
  if (result.success) {
    revalidatePath("/commercial-dashboard/planning")
  }
  return result
}

export async function deactivateCommercialAssignment(id: number) {
  const result = await handleMutation(
    axios.patch(apiUrl(`commercial-admin/assignments/${id}/deactivate`), {}, { headers: await getAuthHeaders() }),
    "/commercial-dashboard/affectations"
  )
  if (result.success) {
    revalidatePath("/commercial-dashboard/planning")
  }
  return result
}

export interface CommercialTransferResult {
  assignmentsTransferred: number
  assignmentsMerged: number
  planningTransferred: number
  planningSkipped: number
}

export async function transferCommercialResources(data: {
  fromAgentId: number
  toAgentId: number
  transferPortfolio: boolean
  transferPlanning: boolean
  note?: string
}) {
  const result = await handleMutation<CommercialTransferResult>(
    axios.post(apiUrl("commercial-admin/transfer"), data, { headers: await getAuthHeaders() }),
    "/commercial-dashboard/affectations"
  )
  if (result.success) {
    revalidatePath("/commercial-dashboard/planning")
    revalidatePath("/commercial-dashboard/affectations")
  }
  return result
}

export async function getCommercialAssignmentHistories() {
  try {
    const response = await axios.get(apiUrl("commercial-admin/histories"), {
      headers: await getAuthHeaders(),
    })
    return response.data || []
  } catch (error) {
    console.error("Erreur chargement historique affectations:", error)
    return []
  }
}

export async function getCommercialPlanning(params?: { agentId?: string; day?: string }) {
  try {
    const response = await axios.get<CommercialPlanningItem[]>(apiUrl("commercial-admin/planning"), {
      headers: await getAuthHeaders(),
      params,
    })
    return response.data || []
  } catch (error) {
    console.error("Erreur chargement planning:", error)
    return []
  }
}

export async function createCommercialPlanning(data: Partial<CommercialPlanningItem>) {
  return handleMutation(
    axios.post(apiUrl("commercial-admin/planning"), data, { headers: await getAuthHeaders() }),
    "/commercial-dashboard/planning"
  )
}

export async function updateCommercialPlanning(id: number, data: Partial<CommercialPlanningItem>) {
  return handleMutation(
    axios.put(apiUrl(`commercial-admin/planning/${id}`), data, { headers: await getAuthHeaders() }),
    "/commercial-dashboard/planning"
  )
}

export async function deactivateCommercialPlanning(id: number) {
  return handleMutation(
    axios.patch(apiUrl(`commercial-admin/planning/${id}/deactivate`), {}, { headers: await getAuthHeaders() }),
    "/commercial-dashboard/planning"
  )
}

export async function importCommercialClients(fileName: string, rows: CommercialImportRow[]) {
  return handleMutation(
    axios.post(apiUrl("commercial-admin/clients/import"), { fileName, rows }, { headers: await getAuthHeaders() }),
    "/commercial-dashboard/import"
  )
}

export async function getCommercialProducts(): Promise<CommercialProduct[]> {
  try {
    const response = await axios.get<CommercialProduct[]>(apiUrl("commercial-admin/products"), {
      headers: await getAuthHeaders(),
    })
    return response.data
  } catch {
    return []
  }
}

export async function getCommercialAgentHistory(params?: {
  agentId?: string
  from?: string
  to?: string
  status?: string
  search?: string
}): Promise<CommercialAgentHistoryEntry[]> {
  try {
    const response = await axios.get<CommercialAgentHistoryEntry[]>(apiUrl("agent/history"), {
      headers: await getAuthHeaders(),
      params,
    })
    return response.data || []
  } catch (error) {
    console.error("Erreur chargement historique agent:", error)
    return []
  }
}

export async function createCommercialProduct(data: {
  name: string
}) {
  return handleMutation(
    axios.post(apiUrl("commercial-admin/products"), data, { headers: await getAuthHeaders() }),
    "/dashboard/produits"
  )
}

export async function updateCommercialProduct(
  id: number,
  data: { name: string }
) {
  return handleMutation(
    axios.put(apiUrl(`commercial-admin/products/${id}`), data, { headers: await getAuthHeaders() }),
    "/dashboard/produits"
  )
}

export async function deleteCommercialProduct(id: number) {
  return handleMutation(
    axios.delete(apiUrl(`commercial-admin/products/${id}`), { headers: await getAuthHeaders() }),
    "/dashboard/produits"
  )
}
