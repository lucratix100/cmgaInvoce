"use server"

import axios from "axios"
import { cookies } from "next/headers"
import type { AgentOrder } from "@/actions/agent-actions"

export interface CommandeItem {
  id: string
  productId: number
  product: string
  reference: string
  quantity: string
}

export type CommercialBlStatus = "BROUILLON" | "CONFIRME" | "MODIFICATION_DEMANDEE" | "MODIFICATION_AUTORISEE" | "VALIDE_ADMIN" | "REJETE_ADMIN" | "ANNULE" | "FACTURE"
export type BonCommandeStatus = "en_preparation" | "en_cours_facturation" | "annulee"

export interface CommercialBl {
  id: string
  executionLogId: string
  status: CommercialBlStatus
  productsSnapshot: Array<{
    productId: number
    productName?: string
    productReference?: string
    quantity: number
  }>
  comment: string | null
  confirmedAt: string | null
  editAuthorizedUntil: string | null
  adminReviewedAt?: string | null
  adminReviewComment?: string | null
  latestRequest: {
    id: string
    status: "EN_ATTENTE" | "APPROUVEE" | "REFUSEE" | "UTILISEE" | "EXPIREE"
    reason: string
    responseNote: string | null
    authorizedUntil: string | null
  } | null
}

export interface BonCommande {
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
  items: CommandeItem[]
  statut: BonCommandeStatus
  commentaire?: string
  commercialBl: CommercialBl | null
}

export interface CommandeFilters {
  dateFrom?: string
  dateTo?: string
  client?: string
}

export interface PersonalClient {
  id: string
  name: string
  phone: string | null
  address: string | null
  email: string | null
  accountNumber: string | null
  contactName: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface PersonalClientInput {
  name: string
  phone: string
  address?: string | null
  email?: string | null
  accountNumber: string
  contactName?: string | null
  notes?: string | null
  isActive?: boolean
}

export interface PersonalOrderInput {
  personalClientId?: number
  client?: PersonalClientInput
  comment?: string | null
  orderLines: Array<{ productId: number; quantity: number }>
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

function mapOrder(order: AgentOrder): BonCommande {
  return {
    id: order.id,
    numeroCommande: order.numeroCommande,
    clientId: order.clientId,
    clientName: order.clientName,
    clientAddress: order.clientAddress,
    clientPhone: order.clientPhone,
    clientCode: order.clientCode,
    parentName: order.parentName,
    dateCommande: order.dateCommande,
    heureCommande: order.heureCommande,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      product: item.product,
      reference: item.reference,
      quantity: item.quantity,
    })),
    statut: order.statut,
    commentaire: order.commentaire || undefined,
    commercialBl: order.commercialBl ?? null,
  }
}

function extractErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined
    return data?.message || data?.error || error.message || fallback
  }
  return fallback
}

export async function getCommandes(filters?: CommandeFilters): Promise<BonCommande[]> {
  try {
    const response = await axios.get(`${process.env.API_URL}agent/orders`, {
      headers: await getAuthHeaders(),
      params: {
        from: filters?.dateFrom,
        to: filters?.dateTo,
        search: filters?.client,
      },
    })

    return (response.data as AgentOrder[]).map(mapOrder)
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes:", error)
    return []
  }
}

export async function getPersonalClients(params?: { search?: string; includeInactive?: boolean }): Promise<PersonalClient[]> {
  try {
    const response = await axios.get(`${process.env.API_URL}agent/personal-clients`, {
      headers: await getAuthHeaders(),
      params,
    })
    return response.data || []
  } catch (error) {
    console.error("Erreur lors de la récupération du portefeuille personnel:", error)
    return []
  }
}

export async function createPersonalClient(data: PersonalClientInput) {
  try {
    const response = await axios.post(`${process.env.API_URL}agent/personal-clients`, data, {
      headers: await getAuthHeaders(),
    })
    return { success: true, data: response.data }
  } catch (error) {
    return {
      success: false,
      error: extractErrorMessage(error, "Erreur lors de la création du client personnel"),
    }
  }
}

export async function updatePersonalClient(id: string, data: PersonalClientInput) {
  try {
    const response = await axios.put(`${process.env.API_URL}agent/personal-clients/${id}`, data, {
      headers: await getAuthHeaders(),
    })
    return { success: true, data: response.data }
  } catch (error) {
    return {
      success: false,
      error: extractErrorMessage(error, "Erreur lors de la modification du client personnel"),
    }
  }
}

export async function deactivatePersonalClient(id: string) {
  try {
    const response = await axios.patch(`${process.env.API_URL}agent/personal-clients/${id}/deactivate`, {}, {
      headers: await getAuthHeaders(),
    })
    return { success: true, data: response.data }
  } catch (error) {
    return {
      success: false,
      error: extractErrorMessage(error, "Erreur lors de la désactivation du client personnel"),
    }
  }
}

export async function createPersonalOrder(data: PersonalOrderInput) {
  try {
    const response = await axios.post(`${process.env.API_URL}agent/personal-orders`, data, {
      headers: await getAuthHeaders(),
    })
    return { success: true, data: response.data }
  } catch (error) {
    return {
      success: false,
      error: extractErrorMessage(error, "Erreur lors de la création du BC personnel"),
    }
  }
}

export async function exportCommandes(filters?: CommandeFilters): Promise<void> {
  const commandes = await getCommandes(filters)
  const header = ["Numéro", "Date", "Client", "Produits", "Statut"]
  const rows = commandes.map((c) => [
    c.numeroCommande,
    c.dateCommande,
    c.clientName,
    String(c.items.length),
    c.statut,
  ])
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
  console.log("Export CSV commandes:\n", csv)
}

export async function updateCommercialBl(
  blId: string,
  orderLines: Array<{ productId: number; quantity: number }>
) {
  try {
    const response = await axios.put(
      `${process.env.API_URL}agent/commercial-bls/${blId}`,
      { orderLines },
      { headers: await getAuthHeaders() }
    )
    return { success: true, data: response.data }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || "Erreur lors de la modification du BC commercial",
    }
  }
}

export async function confirmCommercialBl(blId: string) {
  try {
    const response = await axios.post(
      `${process.env.API_URL}agent/commercial-bls/${blId}/confirm`,
      {},
      { headers: await getAuthHeaders() }
    )
    return { success: true, data: response.data }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || "Erreur lors de la confirmation du BC commercial",
    }
  }
}

export async function requestCommercialBlEdit(blId: string, reason: string) {
  try {
    const response = await axios.post(
      `${process.env.API_URL}agent/commercial-bls/${blId}/request-edit`,
      { reason },
      { headers: await getAuthHeaders() }
    )
    return { success: true, data: response.data }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || "Erreur lors de la demande de modification",
    }
  }
}

export async function cancelCommercialBl(blId: string, reason?: string) {
  try {
    const response = await axios.post(
      `${process.env.API_URL}agent/commercial-bls/${blId}/cancel`,
      { reason },
      { headers: await getAuthHeaders() }
    )
    return { success: true, data: response.data }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || "Erreur lors de l’annulation du BC commercial",
    }
  }
}
