'use server'

import axios from 'axios'
import { cookies } from 'next/headers'

interface SearchParams {
    status?: string
    search?: string
    startDate?: string
    endDate?: string
}

export const getInvoices = async (params?: SearchParams) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token
        // Obtenir la date courante au format YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0]

        const response = await axios.get(`${process.env.API_URL}invoices`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            },
            params: {
                status: (params?.status || 'tous') !== 'tous' ? (params?.status || 'tous') : undefined,
                ...(params?.search ? { search: params.search } : {}),
                ...(params?.startDate || today ? { startDate: params?.startDate || today } : {}),
                ...(params?.endDate ? { endDate: params.endDate } : {})
            }
        })

        return response.data || []
    } catch (error) {
        console.log("Erreur lors de la récupération des factures:", error)
        return []
    }
}

// recuperer les factures par intervalle de date
export const getInvoiceByDateRange = async (startDate: string, endDate: string) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accesToken")?.value || "{}").token
        const response = await axios.get(`${process.env.API_URL}invoices/date`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            },
            params: {
                startDate,
                endDate
            }
        })
        return response.data
    } catch (error) {
        console.error("Erreur lors de la récupération des factures:", error)
        return []
    }


}

export const getInvoiceByNumber = async (invoiceNumber: string) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token
        const response = await axios.get(`${process.env.API_URL}invoice/${invoiceNumber}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        return response.data
    } catch (error) {
        console.log("Erreur lors de la récupération de la facture:", error)
        return null
    }
}