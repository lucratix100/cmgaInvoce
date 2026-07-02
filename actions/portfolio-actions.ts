"use server"

import axios from "axios"
import { cookies } from "next/headers"
import {
  createPersonalClient,
  deactivatePersonalClient,
  getPersonalClients,
  updatePersonalClient,
  type PersonalClient,
  type PersonalClientInput,
} from "@/actions/commande-actions"

export interface AssignedPortfolioClient {
  id: string
  source: "ADMIN"
  targetType: "CLIENT" | "LOCATION"
  commercialClientId: number | null
  commercialClientLocationId: number | null
  name: string
  parentName: string | null
  type: "MAGASIN" | "INDIVIDUEL" | null
  phone: string
  address: string
  accountNumber: string
  note: string | null
  assignedAt: string
  isActive: boolean
}

export type { PersonalClient, PersonalClientInput }

async function getAuthHeaders() {
  const cookieStore = await cookies()
  const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  }
}

export async function getAssignedPortfolio(params?: { search?: string }): Promise<AssignedPortfolioClient[]> {
  try {
    const response = await axios.get(`${process.env.API_URL}agent/portfolio/assigned`, {
      headers: await getAuthHeaders(),
      params,
    })
    return response.data || []
  } catch (error) {
    console.error("Erreur chargement portefeuille attribué:", error)
    return []
  }
}

export {
  createPersonalClient,
  deactivatePersonalClient,
  getPersonalClients,
  updatePersonalClient,
}
