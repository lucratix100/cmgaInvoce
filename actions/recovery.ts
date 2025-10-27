'use server'

import axios from 'axios'
import { cookies } from 'next/headers'

// Types pour les factures urgentes
export interface UrgentInvoice {
  id: number
  invoiceNumber: string
  accountNumber: string
  date: string
  status: string
  isCompleted: boolean
  isCompleteDelivery: boolean
  totalTtc: number
  statusPayment: string
  isUrgent: boolean
  customer: {
    id: number
    name: string
    phone: string
  } | null
  depot?: {
    id: number
    name: string
  } | null
}

// Types pour les paramètres de recouvrement
export interface RecoverySetting {
  id: number
  rootId: number | null
  defaultDays: number
  isActive: boolean
  root?: {
    id: number
    name: string
  } | null
}

// Type pour les racines
export interface Root {
  id: number
  name: string
}

// Fonction utilitaire pour récupérer le token depuis les cookies côté serveur
const getTokenFromCookies = async (): Promise<string | null> => {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get("accessToken")
    
    if (accessToken) {
      const parsed = JSON.parse(accessToken.value)
      return parsed.token
    }
    
    return null
  } catch (error) {
    console.error('Erreur lors de la récupération du token:', error)
    return null
  }
}

// Récupérer les factures urgentes
export const getUrgentInvoices = async (): Promise<{
  success: boolean
  urgentInvoices?: UrgentInvoice[]
  count?: number
  error?: string
  message?: string
}> => {
  try {
    const token = await getTokenFromCookies()
    if (!token) {
      throw new Error('Token d\'authentification non trouvé')
    }

    const response = await axios.get(`${process.env.API_URL}recovery/urgent-invoices`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    // Le backend retourne { success: true, data: [...], settings: {...} }
    // Mais le RecoveryClient attend { success: true, urgentInvoices: [...], count: number }
    const backendData = response.data
    
    if (backendData.success) {
      return {
        success: true,
        urgentInvoices: backendData.data || [],
        count: backendData.data?.length || 0
      }
    } else {
      return {
        success: false,
        error: backendData.error,
        message: backendData.message,
        urgentInvoices: [],
        count: 0
      }
    }
  } catch (error: any) {
    console.error('Erreur lors de la récupération des factures urgentes:', error)
    return {
      success: false,
      error: error.response?.data?.error || 'Erreur lors de la récupération des factures urgentes',
      urgentInvoices: [],
      count: 0
    }
  }
}

// Récupérer la configuration des délais
export const getRecoverySettings = async (): Promise<{
  success: boolean
  settings: RecoverySetting[]
}> => {
  try {
    const token = await getTokenFromCookies()
    if (!token) {
      throw new Error('Token d\'authentification non trouvé')
    }

    const response = await axios.get(`${process.env.API_URL}recovery/settings`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    return response.data
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error)
    throw new Error('Erreur lors de la récupération des paramètres')
  }
}

// Récupérer les délais par racine
export const getRecoverySettingsByRoot = async (): Promise<{
  success: boolean
  data: {
    global: RecoverySetting | null
    byRoot: RecoverySetting[]
  }
}> => {
  try {
    const token = await getTokenFromCookies()
    if (!token) {
      throw new Error('Token d\'authentification non trouvé')
    }

    const response = await axios.get(`${process.env.API_URL}recovery/settings/by-root`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    return response.data
  } catch (error) {
    console.error('Erreur lors de la récupération des délais par racine:', error)
    throw new Error('Erreur lors de la récupération des délais par racine')
  }
}

// Récupérer les racines disponibles
export const getRoots = async (): Promise<{
  success: boolean
  data: Root[]
}> => {
  try {
    const token = await getTokenFromCookies()
    if (!token) {
      throw new Error('Token d\'authentification non trouvé')
    }

    const response = await axios.get(`${process.env.API_URL}recovery/roots`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    return response.data
  } catch (error) {
    console.error('Erreur lors de la récupération des racines:', error)
    throw new Error('Erreur lors de la récupération des racines')
  }
}

// Mettre à jour la configuration des délais
export const updateRecoverySettings = async (data: {
  rootId?: number | null
  defaultDays: number
  isActive?: boolean
}): Promise<{
  success: boolean
  setting: RecoverySetting
}> => {
  try {
    const token = await getTokenFromCookies()
    if (!token) {
      throw new Error('Token d\'authentification non trouvé')
    }

    const response = await axios.post(`${process.env.API_URL}recovery/settings`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    return response.data
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error)
    throw new Error('Erreur lors de la mise à jour des paramètres')
  }
}

// Créer un nouveau paramètre de recouvrement
export const createRecoverySetting = async (data: {
  rootId?: number | null
  defaultDays: number
  isActive?: boolean
}): Promise<{
  success: boolean
  setting: RecoverySetting
}> => {
  try {
    const token = await getTokenFromCookies()
    if (!token) {
      throw new Error('Token d\'authentification non trouvé')
    }

    const response = await axios.post(`${process.env.API_URL}recovery/settings/create`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    return response.data
  } catch (error) {
    console.error('Erreur lors de la création du paramètre:', error)
    throw new Error('Erreur lors de la création du paramètre')
  }
}

// Supprimer un paramètre de recouvrement
export const deleteRecoverySetting = async (settingId: number): Promise<{
  success: boolean
  message: string
}> => {
  try {
    const token = await getTokenFromCookies()
    if (!token) {
      throw new Error('Token d\'authentification non trouvé')
    }

    const response = await axios.delete(`${process.env.API_URL}recovery/settings/${settingId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    return response.data
  } catch (error: any) {
    console.error('Erreur lors de la suppression du paramètre:', error)
    throw new Error(error.response?.data?.error || 'Erreur lors de la suppression du paramètre')
  }
}

// Mettre à jour le délai personnalisé d'une facture
export const updateCustomDelay = async (invoiceId: number, customDays: number): Promise<{
  success: boolean
  data: any
}> => {
  try {
    const token = await getTokenFromCookies()
    if (!token) {
      throw new Error('Token d\'authentification non trouvé')
    }

    const response = await axios.post(`${process.env.API_URL}recovery/invoices/${invoiceId}/custom-delay`, 
      { customDays }, 
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    )

    return response.data
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du délai personnalisé:', error)
    throw new Error(error.response?.data?.error || 'Erreur lors de la mise à jour du délai personnalisé')
  }
}

// Mettre à jour le statut urgent de toutes les factures
export const updateUrgentStatus = async (): Promise<{
  success: boolean
  message: string
  updatedCount: number
}> => {
  try {
    const token = await getTokenFromCookies()
    if (!token) {
      throw new Error('Token d\'authentification non trouvé')
    }

    const response = await axios.post(`${process.env.API_URL}recovery/update-urgent-status`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    return response.data
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du statut urgent:', error)
    throw new Error(error.response?.data?.error || 'Erreur lors de la mise à jour du statut urgent')
  }
} 

export async function getCustomDelays() {
  try {
    const token = await getTokenFromCookies()
    if (!token) {
      throw new Error('Token d\'authentification non trouvé')
    }

    const response = await axios.get(`${process.env.API_URL}recovery/custom-delays`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    return response.data
  } catch (error: any) {
    console.error('Erreur lors de la récupération des délais personnalisés:', error)
    throw new Error(error.response?.data?.error || 'Erreur lors de la récupération des délais personnalisés')
  }
}

export async function deleteCustomDelay(id: number) {
  try {
    const token = await getTokenFromCookies()
    if (!token) {
      throw new Error('Token d\'authentification non trouvé')
    }

    const response = await axios.delete(`${process.env.API_URL}recovery/custom-delays/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    return response.data
  } catch (error: any) {
    console.error('Erreur lors de la suppression du délai personnalisé:', error)
    throw new Error(error.response?.data?.error || 'Erreur lors de la suppression du délai personnalisé')
  }
} 

export async function checkExpiredDelays() {
  try {
    const token = await getTokenFromCookies()
    if (!token) {
      throw new Error('Token d\'authentification non trouvé')
    }

    const response = await axios.post(`${process.env.API_URL}recovery/check-expired-delays`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    return response.data
  } catch (error: any) {
    console.error('Erreur lors de la vérification des délais expirés:', error)
    throw new Error(error.response?.data?.error || 'Erreur lors de la vérification des délais expirés')
  }
} 