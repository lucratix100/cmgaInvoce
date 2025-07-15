import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import Invoice from '#models/invoice'
import { InvoiceStatus } from '../app/enum/index.js'

async function testUpdateInvoicesStatus() {
    try {
        await app.init()

        console.log('🔍 Test de mise à jour des factures...')

        // Définir un intervalle de dates de test (derniers 30 jours)
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 30)

        console.log(`📅 Intervalle de dates: ${startDate.toISOString().split('T')[0]} à ${endDate.toISOString().split('T')[0]}`)

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
            console.log(`\n🔍 Analyse de la facture: ${invoice.invoiceNumber}`)

            // Vérifier si la facture contient la lettre "R" dans sa référence (numéro de facture)
            const hasReturnReference = invoice.invoiceNumber?.toUpperCase().includes('R')

            if (hasReturnReference) {
                console.log(`  ✅ Numéro de facture contient "R": ${invoice.invoiceNumber}`)
            }

            if (hasReturnReference) {
                console.log(`  🔄 Mise à jour de la facture ${invoice.invoiceNumber}:`)
                console.log(`     Ancien statut: ${invoice.status}`)
                console.log(`     Nouveau statut: ${InvoiceStatus.RETOUR}`)
                console.log(`     Ancien totalTTC: ${invoice.totalTTC}`)
                console.log(`     Nouveau totalTTC: ${-Math.abs(invoice.totalTTC)}`)

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
            } else {
                console.log(`  ⏭️  Aucune référence avec "R" trouvée, facture ignorée`)
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

        console.log('\n✅ Test terminé avec succès!')

    } catch (error) {
        console.error('❌ Erreur lors du test:', error)
    } finally {
        await app.terminate()
    }
}

// Exécuter le test si le script est appelé directement
if (process.argv[1] === import.meta.url) {
    testUpdateInvoicesStatus()
}

export default testUpdateInvoicesStatus 