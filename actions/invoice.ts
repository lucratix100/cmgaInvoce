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

        // Si une recherche est spécifiée, ne pas appliquer de contrainte de date par défaut
        // pour permettre une recherche globale
        const hasSearch = params?.search && params.search.trim() !== ''
        
        // Construire les paramètres de requête
        const queryParams: any = {
            status: (params?.status || 'tous') !== 'tous' ? (params?.status || 'tous') : undefined,
        }
        
        // Ajouter la recherche si elle existe
        if (params?.search) {
            queryParams.search = params.search
        }
        
        // Gérer les dates : ne pas appliquer de date par défaut si il y a une recherche
        if (params?.startDate) {
            queryParams.startDate = params.startDate
        } else if (!hasSearch) {
            // Seulement appliquer la date par défaut s'il n'y a pas de recherche
            queryParams.startDate = today
        }
        
        if (params?.endDate) {
            queryParams.endDate = params.endDate
        }
        
        console.log('getInvoices params:', { params, hasSearch, queryParams })
        
        const response = await axios.get(`${process.env.API_URL}invoices`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            },
            params: queryParams
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
    } catch (error: any) {
        console.log("Erreur lors de la récupération de la facture:", error)
        if (error.response?.status === 404) {
            return { error: 'Facture non trouvée' }
        }
        return { error: 'Erreur lors de la récupération de la facture' }
    }
}
export const updateInvoiceStatus = async (invoiceNumber: string, status: string) => {
    try {
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}" ).token
        const response = await axios.patch(`${process.env.API_URL}invoice/${invoiceNumber}`, { status }, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Accept': 'application/json'
        }
        })
        return response.data
    } catch (error: any) {
        console.log("Erreur lors de la mise à jour du statut:", error)
        if (error.response?.status === 404) {
            throw new Error('Facture non trouvée')
        }
        throw new Error('Erreur lors de la mise à jour du statut')
    }
}

export const createBlForInvoice = async (
    invoiceNumber: string,
    products: { reference: string, quantiteLivree: number }[]
) => {
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}" ).token
    await axios.post(`${process.env.API_URL}process-delivery`, {
        invoiceNumber,
        products
    }, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Accept': 'application/json'
        }
    })
}

export const processDelivery = async (
    invoiceNumber: string,
    products: { reference: string, quantiteLivree: number }[],
    isCompleteDelivery: boolean = false,
    driverId?: number,
    magasinierId?: number
) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}" ).token
        
        const response = await axios.post(`${process.env.API_URL}process-delivery`, {
            invoiceNumber,
            products,
            isCompleteDelivery,
            driverId,
            magasinierId
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        
        return response.data
    } catch (error: any) {
        console.error("Erreur lors du traitement de la livraison:", error)
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message)
        }
        throw new Error('Erreur lors du traitement de la livraison')
    }
}

export const confirmBl = async (invoiceNumber: string) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}" ).token
        
        const response = await axios.post(`${process.env.API_URL}confirm-bl`, {
            invoiceNumber
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        
        return response.data
    } catch (error: any) {
        console.error("Erreur lors de la confirmation du BL:", error)
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message)
        }
        throw new Error('Erreur lors de la confirmation du BL')
    }
}

export const getBlsByInvoice = async (invoiceNumber: string) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}" ).token
        
        const response = await axios.get(`${process.env.API_URL}invoices/${invoiceNumber}/bls`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        
        return response.data
    } catch (error: any) {
        console.error("Erreur lors de la récupération des BLs:", error)
        return []
    }
}

export const getInvoiceWithPayments = async (invoiceNumber: string) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token
        
        // Récupérer la facture avec les paiements
        const response = await axios.get(`${process.env.API_URL}invoices?invoiceNumber=${invoiceNumber}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        
        const invoices = response.data || []
        const invoice = invoices.find((inv: any) => inv.invoiceNumber === invoiceNumber)
        
        if (!invoice) {
            return { error: 'Facture non trouvée' }
        }
        
        // Récupérer les paiements de la facture
        const paymentsResponse = await axios.get(`${process.env.API_URL}payments?invoiceNumber=${invoiceNumber}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        
        const payments = paymentsResponse.data || []
        const totalPaid = payments.reduce((acc: number, payment: any) => acc + Number(payment.amount), 0)
        const remainingAmount = Math.max(0, Number(invoice.totalTtc || invoice.totalTTC || 0) - totalPaid)
        
        return {
            invoice,
            payments,
            totalPaid,
            remainingAmount,
            totalTTC: Number(invoice.totalTtc || invoice.totalTTC || 0)
        }
    } catch (error: any) {
        console.log("Erreur lors de la récupération de la facture avec paiements:", error)
        if (error.response?.status === 404) {
            return { error: 'Facture non trouvée' }
        }
        return { error: 'Erreur lors de la récupération de la facture' }
    }
}

export const updateBl = async (
    blId: number,
    products: Array<{ reference: string, quantiteLivree: number, designation: string, quantite: number, prixUnitaire: number }>,
    isCompleteDelivery: boolean,
    driverId: number,
    magasinierId?: number
) => {
    try {
        const cookieStore = await cookies()
        const accessToken = cookieStore.get("accessToken")
        const userCookie = cookieStore.get("user")

        if (!accessToken || !userCookie) {
            throw new Error("Cookies manquants")
        }

        const token = JSON.parse(accessToken.value || "{}").token
        const user = JSON.parse(userCookie.value || "{}")

        const response = await axios.patch(`${process.env.API_URL}bls/${blId}`, {
            products,
            isCompleteDelivery,
            driverId,
            magasinierId: magasinierId || user.id
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })

        return response.data
    } catch (error: any) {
        console.error('Erreur lors de la mise à jour du BL:', error)
        throw new Error(error.response?.data?.message || "Erreur lors de la mise à jour du BL")
    }
}

export const getBlEditInfo = async (blId: number) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token
        const response = await axios.get(`${process.env.API_URL}bls/${blId}/edit-info`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        return response.data
    } catch (error: any) {
        console.error("Erreur lors de la récupération des infos d'édition du BL:", error)
        return []
    }
}