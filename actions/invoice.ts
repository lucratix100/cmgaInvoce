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
        console.log(token, 'token')

        if (!token) {
            throw new Error("Non authentifié")
        }

        const response = await axios.get(`${process.env.API_URL}invoices`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            },
            params: {
                ...(params?.status && params.status !== 'tous' ? { status: params.status } : {}),
                ...(params?.search ? { search: params.search } : {}),
                ...(params?.startDate ? { startDate: params.startDate } : {}),
                ...(params?.endDate ? { endDate: params.endDate } : {})
            }
        })

        return response.data || []
    } catch (error) {
        console.error("Erreur lors de la récupération des factures:", error)
        return []
    }
}

// recuperer les factures par intervalle de date
export const getInvoiceByDateRange = async (startDate: string, endDate: string) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accesToken")?.value || "{}").token

        console.log('Dates envoyées:', { startDate, endDate }) // Debug

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
        throw error
    }


}

export const getInvoiceByNumber = async (number: string) => {
    try {

        const cookieStore = await cookies()

        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        const response = await axios.get(`${process.env.API_URL}invoices/${number}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        console.log(response.data, 'response')
        return response.data
    } catch (error) {
        console.error("Erreur lors de la récupération de la facture:", error)
        throw error
    }
}