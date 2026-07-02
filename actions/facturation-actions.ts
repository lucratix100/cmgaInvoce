"use server"

import axios from "axios"
import { cookies } from "next/headers"

export type FacturationBlStatus = "VALIDE_ADMIN" | "FACTURE"

export interface FacturationCommercialBl {
  id: string
  executionLogId: string
  numeroCommande: string
  status: FacturationBlStatus
  confirmedAt: string | null
  facturedAt: string | null
  adminReviewedAt: string | null
  adminReviewComment: string | null
  clientName: string
  clientAccountNumber: string
  parentName: string | null
  agentName: string
  products: Array<{
    productId: number
    productName: string
    productReference: string
    quantity: number
  }>
  facturedBy: string | null
}

export interface FacturationBlFilters {
  status?: string
  search?: string
  from?: string
  to?: string
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

export async function getFacturationCommercialBls(filters?: FacturationBlFilters): Promise<FacturationCommercialBl[]> {
  try {
    const response = await axios.get(`${process.env.API_URL}facturation/commercial-bls`, {
      headers: await getAuthHeaders(),
      params: filters,
    })
    return response.data || []
  } catch (error) {
    console.error("Erreur chargement BC facturation:", error)
    return []
  }
}

export async function markCommercialBlAsFactured(id: string) {
  try {
    const response = await axios.patch(
      `${process.env.API_URL}facturation/commercial-bls/${id}/facture`,
      {},
      { headers: await getAuthHeaders() }
    )
    return { success: true, data: response.data }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || "Erreur lors du passage en facturé",
    }
  }
}
