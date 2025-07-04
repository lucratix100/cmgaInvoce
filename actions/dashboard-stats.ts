"use server"

import axios from 'axios'
import { cookies } from 'next/headers'
import { InvoiceStatus, InvoicePaymentStatus } from "@/types/enums"

const API_URL = process.env.API_URL 

export interface DashboardStats {
  totalInvoices: number
  deliveredInvoices: number
  pendingInvoices: number
  inProgressInvoices: number
  totalRevenue: number
  paidInvoices: number
  partialPaidInvoices: number
  unpaidInvoices: number
  totalDepots: number
  totalDrivers: number
  totalUsers: number
  monthlyStats: MonthlyStat[]
  weeklyStats: WeeklyStat[]
  dailyStats: DailyStat[]
}

export interface MonthlyStat {
  month: string
  total: number
  delivered: number
  revenue: number
}

export interface WeeklyStat {
  week: string
  total: number
  delivered: number
  revenue: number
}

export interface DailyStat {
  date: string
  total: number
  delivered: number
  revenue: number
}

export interface AdvancedStats {
  paymentModes: { mode: string, count: number }[]
  paymentRate: { paid: number, unpaid: number, total: number }
  topCustomers: { id: number, name: string, total: number }[]
}

export async function getDashboardStats(period: 'daily' | 'weekly' | 'monthly' = 'monthly', start?: string, end?: string): Promise<DashboardStats> {
  try {
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

    const params: any = { period }
    if (start) params.start = start
    if (end) params.end = end

    const response = await axios.get(`${process.env.API_URL}dashboard/stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      },
      params
    })

    return response.data
  } catch (error: any) {
    console.error('Erreur lors de la récupération des statistiques:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error('Impossible de récupérer les statistiques du dashboard')
  }
}

export async function getInvoiceStats(): Promise<{
  total: number
  delivered: number
  pending: number
  inProgress: number
  revenue: number
}> {
  try {
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

    const response = await axios.get(`${process.env.API_URL}dashboard/invoice-stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    return response.data
  } catch (error: any) {
    console.error('Erreur lors de la récupération des statistiques des factures:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error('Impossible de récupérer les statistiques des factures')
  }
}

export async function getPaymentStats(): Promise<{
  total: number
  paid: number
  partialPaid: number
  unpaid: number
}> {
  try {
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

    const response = await axios.get(`${process.env.API_URL}dashboard/payment-stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    return response.data
  } catch (error: any) {
    console.error('Erreur lors de la récupération des statistiques de paiement:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error('Impossible de récupérer les statistiques de paiement')
  }
}

export async function getSystemStats(): Promise<{
  depots: number
  drivers: number
  users: number
}> {
  try {
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

    const response = await axios.get(`${process.env.API_URL}dashboard/system-stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    return response.data
  } catch (error: any) {
    console.error('Erreur lors de la récupération des statistiques système:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error('Impossible de récupérer les statistiques système')
  }
}

export async function getChartData(period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<MonthlyStat[] | WeeklyStat[] | DailyStat[]> {
  try {
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

    const response = await axios.get(`${process.env.API_URL}dashboard/chart-data`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      },
      params: {
        period
      }
    })

    return response.data
  } catch (error: any) {
    console.error('Erreur lors de la récupération des données du graphique:', error)
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }
    throw new Error('Impossible de récupérer les données du graphique')
  }
}

export async function getAdvancedStats(period?: 'daily' | 'weekly' | 'monthly', start?: string, end?: string): Promise<AdvancedStats> {
  const cookieStore = await cookies()
  const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

  const params: any = {}
  if (period) params.period = period
  if (start) params.start = start
  if (end) params.end = end

  const response = await axios.get(`${process.env.API_URL}dashboard/advanced-stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Accept': 'application/json'
    },
    params
  })
  return response.data
} 