import cron from 'node-cron'
import env from '#start/env'
import SageInvoiceImportService from '#services/sage_invoice_import_service'

const schedule = env.get('SAGE_IMPORT_CRON', '*/5 * * * *')

cron.schedule(schedule, async () => {
    console.log('[Cron] Début d\'importation des factures Sage...')
    try {
        const result = await SageInvoiceImportService.run()
        if (result) console.log('[Cron] Importation terminée ✅', result)
    } catch (error) {
        console.error('[Cron] Erreur lors de l\'importation des factures ❌', error)
    }
})

console.log(`[Cron] Import des factures Sage planifié (${schedule})`)
