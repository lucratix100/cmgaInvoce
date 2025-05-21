'use server'

import axios from 'axios'
import { cookies } from 'next/headers'
import { InvoicePaymentStatus, PaymentMethod } from '@/types/enums'

interface PaymentData {
    montant: number
    modePaiement: PaymentMethod
    datePaiement: string
    commentaire?: string
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

        console.log("Ajout d'un paiement pour la facture:", invoiceNumber)
        console.log("Données du paiement:", paymentData)

        // Formatage des données pour l'API
        const formattedData = {
            invoiceNumber: invoiceNumber,
            amount: paymentData.montant,
            paymentMethod: paymentData.modePaiement,
            paymentDate: new Date(paymentData.datePaiement).toISOString().split('T')[0],
            comment: paymentData.commentaire
        }

        console.log("Données formatées pour l'API:", formattedData)
        console.log("URL de l'API pour le paiement:", `${process.env.API_URL}payments`)

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

        console.log("Réponse du serveur pour le paiement:", response.data)
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

        console.log("Récupération des paiements pour la facture:", invoiceNumber)
        const response = await axios.get(
            `${process.env.API_URL}payments/invoice/${encodeURIComponent(invoiceNumber)}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            }
        )

        console.log("Réponse de l'API pour les paiements:", response.data)
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