'use server'

import axios from 'axios'
import { cookies } from 'next/headers'
import { revalidatePath, revalidateTag } from 'next/cache'
import { InvoicePaymentStatus, PaymentMethod } from '@/types/enums'

interface PaymentData {
    montant: number
    modePaiement: PaymentMethod
    datePaiement: string
    commentaire?: string
    chequeInfo?: string
}

interface UpdatePaymentData {
    amount: number
    paymentMethod: PaymentMethod
    paymentDate: string
    comment?: string
    chequeInfo?: string
}

export const markInvoiceAsPaid = async (invoiceId: string) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }

        const response = await axios.patch(
            `${process.env.API_URL}invoices/${invoiceId}/payment-status`,
            { status: InvoicePaymentStatus.PAYE },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            }
        )

        return response.data
    } catch (error) {
        console.error("Erreur lors du marquage de la facture comme payée:", error)
        throw error
    }
}

export const addPayment = async (invoiceNumber: string, paymentData: PaymentData) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }

        if (!invoiceNumber) {
            throw new Error("Le numéro de facture est requis")
        }


        // Formatage des données pour l'API
        const formattedData = {
            invoiceNumber: invoiceNumber,
            amount: paymentData.montant,
            paymentMethod: paymentData.modePaiement,
            paymentDate: new Date(paymentData.datePaiement).toISOString().split('T')[0],
            comment: paymentData.commentaire,
            chequeInfo: paymentData.chequeInfo
        }

        const response = await axios.post(
            `${process.env.API_URL}payments`,
            formattedData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        )

        // Revalider les chemins et tags après l'ajout du paiement
        revalidatePath('/dashboard/invoices')
        revalidatePath(`/dashboard/invoices/${invoiceNumber}`)
        revalidatePath('/factures')
        revalidatePath(`/factures/${invoiceNumber}`)
        revalidateTag('payments')
        revalidateTag(`payments-${invoiceNumber}`)

        return response.data
    } catch (error: any) {
        console.error("Erreur détaillée:", {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            headers: error.response?.headers,
            stack: error.stack
        })
        throw new Error(error.response?.data?.message || error.message || "Erreur lors de l'ajout du paiement")
    }
}

export const getPaymentHistory = async (invoiceNumber: string) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }

        const response = await axios.get(
            `${process.env.API_URL}payments/invoice/${encodeURIComponent(invoiceNumber)}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            }
        )
        return response.data
    } catch (error: any) {
        console.error("Erreur détaillée lors de la récupération des paiements:", {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            headers: error.response?.headers
        })
        throw error
    }
}

export const getPaymentbyInvoiceNumber = async (invoiceNumber: string) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }

        const response = await axios.get(
            `${process.env.API_URL}invoices/${invoiceNumber}/payment`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            }
        )

        return response.data
    } catch (error) {
        console.error("Erreur lors de la récupération des paiements:", error)
        throw error
    }
}

export const updatePayment = async (paymentId: number, paymentData: UpdatePaymentData) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }

        const response = await axios.put(
            `${process.env.API_URL}payments/${paymentId}`,
            paymentData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        )

        // Revalider les chemins et tags après la modification du paiement
        revalidatePath('/dashboard/invoices')
        revalidatePath('/factures')
        revalidateTag('payments')

        return response.data
    } catch (error: any) {
        console.error("Erreur lors de la mise à jour du paiement:", {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        })
        throw new Error(error.response?.data?.error || error.message || "Erreur lors de la mise à jour du paiement")
    }
}

export const deletePayment = async (paymentId: number) => {
    try {
        const cookieStore = await cookies()
        const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

        if (!token) {
            throw new Error("Non authentifié")
        }

        const response = await axios.delete(
            `${process.env.API_URL}payments/${paymentId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            }
        )

        // Revalider les chemins et tags après la suppression du paiement
        revalidatePath('/dashboard/invoices')
        revalidatePath('/factures')
        revalidateTag('payments')

        return response.data
    } catch (error: any) {
        console.error("Erreur lors de la suppression du paiement:", {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        })
        throw new Error(error.response?.data?.error || error.message || "Erreur lors de la suppression du paiement")
    }
}