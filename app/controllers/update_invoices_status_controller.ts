import type { HttpContext } from '@adonisjs/core/http'
import Invoice from '#models/invoice'
import { InvoiceStatus } from '../enum/index.js'

export default class UpdateInvoicesStatusController {
    async updateInvoicesStatus({ request, response }: HttpContext) {
        try {
            const { startDate, endDate } = request.only(['startDate', 'endDate'])

            // Validation des paramètres
            if (!startDate || !endDate) {
                return response.status(400).json({
                    success: false,
                    message: 'Les dates de début et de fin sont requises',
                    error: 'Paramètres manquants'
                })
            }

            // Validation du format des dates
            const start = new Date(startDate)
            const end = new Date(endDate)

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return response.status(400).json({
                    success: false,
                    message: 'Format de date invalide',
                    error: 'Dates invalides'
                })
            }

            if (start > end) {
                return response.status(400).json({
                    success: false,
                    message: 'La date de début doit être antérieure à la date de fin',
                    error: 'Ordre des dates incorrect'
                })
            }

            // Récupérer toutes les factures dans l'intervalle de dates
            const invoices = await Invoice.query()
                .whereBetween('date', [start, end])
                .preload('customer')
                .preload('depot')

            if (invoices.length === 0) {
                return response.json({
                    success: true,
                    message: 'Aucune facture trouvée dans l\'intervalle de dates spécifié',
                    updatedCount: 0
                })
            }

            let updatedCount = 0
            const updatedInvoices = []

            // Traiter chaque facture
            for (const invoice of invoices) {
                // Vérifier si la facture contient la lettre "R" dans sa référence (numéro de facture)
                const hasReturnReference = invoice.invoiceNumber?.toUpperCase().includes('R')

                // Si la facture contient une référence avec "R", la mettre à jour
                if (hasReturnReference) {
                    try {
                        // Mettre à jour le statut et le montant
                        await invoice.merge({
                            status: InvoiceStatus.RETOUR,
                            totalTTC: -Math.abs(invoice.totalTTC) // Rendre le montant négatif
                        }).save()

                        updatedCount++
                        updatedInvoices.push({
                            id: invoice.id,
                            invoiceNumber: invoice.invoiceNumber,
                            oldStatus: invoice.status,
                            newStatus: InvoiceStatus.RETOUR,
                            oldTotalTTC: invoice.totalTTC,
                            newTotalTTC: -Math.abs(invoice.totalTTC)
                        })

                        console.log(`Facture ${invoice.invoiceNumber} mise à jour: statut -> retour, totalTTC -> ${-Math.abs(invoice.totalTTC)}`)
                    } catch (error) {
                        console.error(`Erreur lors de la mise à jour de la facture ${invoice.invoiceNumber}:`, error)
                    }
                }
            }

            return response.json({
                success: true,
                message: `Mise à jour terminée. ${updatedCount} facture(s) mise(s) à jour.`,
                updatedCount,
                updatedInvoices
            })

        } catch (error) {
            console.error('Erreur lors de la mise à jour des factures:', error)
            return response.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message || 'Erreur inconnue'
            })
        }
    }
} 