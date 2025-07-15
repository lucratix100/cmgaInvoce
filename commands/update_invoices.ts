import { BaseCommand, flags } from '@adonisjs/core/ace'
import Invoice from '#models/invoice'
import { InvoiceStatus } from '../app/enum/index.js'

export default class UpdateInvoices extends BaseCommand {
    static commandName = 'update:invoices'
    static description = 'Mettre à jour le statut des factures contenant R dans leur numéro'

    @flags.string({
        alias: 's',
        description: 'Date de début (YYYY-MM-DD)',
    })
    declare startDate: string

    @flags.string({
        alias: 'e',
        description: 'Date de fin (YYYY-MM-DD)',
    })
    declare endDate: string

    async run() {
        const startDate = this.startDate
        const endDate = this.endDate

        console.log('🔍 Mise à jour des factures...')
        console.log(`📅 Intervalle de dates: ${startDate} à ${endDate}`)

        try {
            // Récupérer les factures dans l'intervalle
            const invoices = await Invoice.query()
                .whereBetween('date', [startDate, endDate])
                .preload('customer')
                .preload('depot')

            console.log(`📊 Nombre de factures trouvées: ${invoices.length}`)

            if (invoices.length === 0) {
                console.log('✅ Aucune facture à traiter')
                return
            }

            let updatedCount = 0
            const updatedInvoices = []

            // Traiter chaque facture
            for (const invoice of invoices) {
                // Vérifier si la facture contient la lettre "R" dans son numéro
                const hasReturnReference = invoice.invoiceNumber?.toUpperCase().includes('R')

                if (hasReturnReference) {
                    console.log(`🔄 Mise à jour de la facture ${invoice.invoiceNumber}:`)
                    console.log(`   Ancien statut: ${invoice.status}`)
                    console.log(`   Nouveau statut: ${InvoiceStatus.RETOUR}`)
                    console.log(`   Ancien totalTTC: ${invoice.totalTTC}`)
                    console.log(`   Nouveau totalTTC: ${-Math.abs(invoice.totalTTC)}`)

                    // Mettre à jour la facture
                    await invoice.merge({
                        status: InvoiceStatus.RETOUR,
                        totalTTC: -Math.abs(invoice.totalTTC)
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
                }
            }

            console.log(`\n📈 Résumé:`)
            console.log(`   Total des factures analysées: ${invoices.length}`)
            console.log(`   Factures mises à jour: ${updatedCount}`)

            if (updatedInvoices.length > 0) {
                console.log(`\n📋 Détail des mises à jour:`)
                updatedInvoices.forEach((invoice, index) => {
                    console.log(`   ${index + 1}. ${invoice.invoiceNumber}`)
                    console.log(`      Statut: ${invoice.oldStatus} → ${invoice.newStatus}`)
                    console.log(`      TotalTTC: ${invoice.oldTotalTTC} → ${invoice.newTotalTTC}`)
                })
            }

            console.log('\n✅ Mise à jour terminée!')

        } catch (error) {
            console.error('❌ Erreur lors de la mise à jour:', error)
            this.exitCode = 1
        }
    }
} 