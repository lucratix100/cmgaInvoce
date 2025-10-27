'use server'

import axios from 'axios'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

interface SearchParams {
    status?: string
    search?: string
    startDate?: string
    endDate?: string
    depot?: string
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
        const queryParams: any = {}

        // Si il y a une recherche, ne pas ajouter les autres filtres pour permettre une recherche globale
        if (!hasSearch) {
            queryParams.status = (params?.status || 'tous') !== 'tous' ? (params?.status || 'tous') : undefined
            queryParams.depot = (params?.depot || 'tous') !== 'tous' ? (params?.depot || 'tous') : undefined
        }

        // Ajouter la recherche si elle existe
        if (params?.search) {
            queryParams.search = params.search
        }

        // Gérer les dates : ne pas appliquer de contraintes de date si il y a une recherche
        if (!hasSearch) {
            if (params?.startDate) {
                queryParams.startDate = params.startDate
            } else {
                // Seulement appliquer la date par défaut s'il n'y a pas de recherche
                queryParams.startDate = today
            }

            if (params?.endDate) {
                queryParams.endDate = params.endDate
            }
        }

        console.log('getInvoices params:', { params, hasSearch, queryParams })

        const response = await axios.get(`${process.env.API_URL}invoices`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            },
            params: queryParams
        })

        // Si la réponse contient des statistiques (nouveau format), retourner les factures
        if (response.data && typeof response.data === 'object' && 'invoices' in response.data) {
            return response.data.invoices || []
        }
        // Ancien format (retour direct des factures)
        return response.data || []
    } catch (error) {
        console.log("Erreur lors de la récupération des factures:", error)
        return []
    }
}

// Récupérer les factures avec les statistiques
export const getInvoicesWithStatistics = async (params?: SearchParams) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token
        // Obtenir la date courante au format YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0]

        // Si une recherche est spécifiée, ne pas appliquer de contrainte de date par défaut
        // pour permettre une recherche globale
        const hasSearch = params?.search && params.search.trim() !== ''

        // Construire les paramètres de requête
        const queryParams: any = {}

        // Si il y a une recherche, ne pas ajouter les autres filtres pour permettre une recherche globale
        if (!hasSearch) {
            queryParams.status = (params?.status || 'tous') !== 'tous' ? (params?.status || 'tous') : undefined
            queryParams.depot = (params?.depot || 'tous') !== 'tous' ? (params?.depot || 'tous') : undefined
        }

        // Ajouter la recherche si elle existe
        if (params?.search) {
            queryParams.search = params.search
        }

        // Gérer les dates : ne pas appliquer de contraintes de date si il y a une recherche
        if (!hasSearch) {
            if (params?.startDate) {
                queryParams.startDate = params.startDate
            } else {
                // Seulement appliquer la date par défaut s'il n'y a pas de recherche
                queryParams.startDate = today
            }

            if (params?.endDate) {
                queryParams.endDate = params.endDate
            }
        }

        console.log('getInvoicesWithStatistics params:', { params, hasSearch, queryParams })

        const response = await axios.get(`${process.env.API_URL}invoices`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            },
            params: queryParams
        })

        // Retourner les données complètes avec statistiques
        return response.data || { invoices: [], statistics: null }
    } catch (error) {
        console.log("Erreur lors de la récupération des factures avec statistiques:", error)
        return { invoices: [], statistics: null }
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

export const updateInvoiceById = async (data: any) => {
    console.log('updateInvoiceById data:', data)
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token
        const response = await axios.put(`${process.env.API_URL}invoices/${data.id}`, data, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        revalidatePath(`/dashboard/invoices/${data.id}`)
        return response.data
    } catch (error: any) {
        console.log("Erreur lors de la mise à jour de la facture:", error)
        if (error.response?.status === 404) {
            throw new Error('Cette facture n\'existe pas')
        }
        throw new Error('Erreur lors de la mise à jour de la facture')
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
            return { error: 'Cette facture n\'existe pas' }
        }
        return { error: 'Cette facture n\'existe pas' }
    }
}
export const updateInvoiceStatus = async (invoiceNumber: string, status: string) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token
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
            throw new Error('Cette facture n\'existe pas')
        }
        throw new Error('Erreur lors de la mise à jour du statut')
    }
}

export const markInvoiceAsDeliveredWithReturn = async (invoiceNumber: string, comment?: string) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token
        const response = await axios.post(`${process.env.API_URL}invoice/${invoiceNumber}/mark-delivered-with-return`, 
            { comment }, 
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            }
        )
        return response.data
    } catch (error: any) {
        console.log("Erreur lors du marquage de la facture comme 'LIVREE':", error)
        if (error.response?.status === 404) {
            throw new Error('Cette facture n\'existe pas')
        }
        if (error.response?.status === 400) {
            throw new Error(error.response.data.error || 'Erreur de validation')
        }
        if (error.response?.status === 403) {
            throw new Error('Vous n\'avez pas les permissions pour effectuer cette action')
        }
        throw new Error('Erreur lors du marquage de la facture')
    }
}

export const createBlForInvoice = async (
    invoiceNumber: string,
    products: { reference: string, quantiteLivree: number }[]
) => {
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token
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
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

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
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

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
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        const response = await axios.get(`${process.env.API_URL}invoices/${invoiceNumber}/bls`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
        return response.data
    } catch (error) {
        console.error("Erreur lors de la récupération des BLs:", error)
        return []
    }
}

export const getInvoicePaymentCalculations = async (invoiceNumber: string, excludePaymentId?: number) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        // Construire les paramètres de requête
        const params: any = {}
        if (excludePaymentId) {
            params.excludePaymentId = excludePaymentId
        }

        const response = await axios.get(`${process.env.API_URL}invoices/${invoiceNumber}/payment-calculations`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            },
            params
        })

        if (response.data.success) {
            return response.data.data
        } else {
            throw new Error('Erreur lors de la récupération des calculs')
        }
    } catch (error: any) {
        console.error("Erreur lors de la récupération des calculs de paiement:", error)
        if (error.response?.status === 404) {
            return { error: 'Cette facture n\'existe pas' }
        }
        return { error: 'Erreur lors de la récupération des calculs de paiement' }
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