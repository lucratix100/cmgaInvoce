import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

interface UpdateInvoicesRequest {
    startDate: string
    endDate: string
}

interface UpdateInvoicesResponse {
    success: boolean
    message: string
    updatedCount?: number
    error?: string
}

export async function POST(request: NextRequest) {
    try {
        const body: UpdateInvoicesRequest = await request.json()
        const { startDate, endDate } = body

        // Validation des données
        if (!startDate || !endDate) {
            return NextResponse.json({
                success: false,
                message: 'Les dates de début et de fin sont requises',
                error: 'Dates manquantes'
            } as UpdateInvoicesResponse, { status: 400 })
        }

        // Validation du format des dates
        const start = new Date(startDate)
        const end = new Date(endDate)

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json({
                success: false,
                message: 'Format de date invalide',
                error: 'Dates invalides'
            } as UpdateInvoicesResponse, { status: 400 })
        }

        if (start > end) {
            return NextResponse.json({
                success: false,
                message: 'La date de début doit être antérieure à la date de fin',
                error: 'Ordre des dates incorrect'
            } as UpdateInvoicesResponse, { status: 400 })
        }

        // Appel à l'API backend pour mettre à jour les factures
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3333'

        const response = await axios.post(`${backendUrl}/api/update-invoices-status`, {
            startDate,
            endDate
        }, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 30000 // 30 secondes de timeout
        })

        return NextResponse.json(response.data as UpdateInvoicesResponse)

    } catch (error: any) {
        console.error('Erreur lors de la mise à jour des factures:', error)

        // Gestion des erreurs axios
        if (error.response) {
            // Erreur de réponse du serveur
            return NextResponse.json({
                success: false,
                message: 'Erreur du serveur backend',
                error: error.response.data?.message || error.response.statusText
            } as UpdateInvoicesResponse, { status: error.response.status })
        } else if (error.request) {
            // Erreur de connexion
            return NextResponse.json({
                success: false,
                message: 'Impossible de se connecter au serveur backend',
                error: 'Erreur de connexion'
            } as UpdateInvoicesResponse, { status: 503 })
        } else {
            // Autre erreur
            return NextResponse.json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message || 'Erreur inconnue'
            } as UpdateInvoicesResponse, { status: 500 })
        }
    }
} 