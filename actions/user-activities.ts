'use server'

import axios from 'axios'
import { cookies } from 'next/headers'

export interface UserActivity {
  id: number
  userId: number
  action: string
  role: string
  invoiceId: number | null
  details: any
  createdAt: string
  user: {
    id: string
    firstname: string
    lastname: string
    role: string
  }
  invoice?: {
    id: number
    invoice_number: string
  } | null
}

export const getRecentActivities = async (): Promise<UserActivity[]> => {
  try {
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

    const response = await axios.get(`${process.env.API_URL}user-activities`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })
    
    return response.data
  } catch (error) {
    console.error("Erreur lors de la récupération des activités:", error)
    return []
  }
}

export const getRecouvrementActivities = async (): Promise<UserActivity[]> => {
  try {
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

    const response = await axios.get(`${process.env.API_URL}user-activities/recouvrement`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })
    
    return response.data
  } catch (error) {
    console.error("Erreur lors de la récupération des activités de recouvrement:", error)
    return []
  }
} 