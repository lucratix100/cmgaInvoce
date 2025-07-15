import cron from 'node-cron'
import SageInvoicesController from '#controllers/sage_invoices_controller'




cron.schedule('*/1 * * * *', async () => {
    console.log('[Cron] Début d\'importation des factures XML...')
    try {
        const controller = new SageInvoicesController()
        await controller.invoice_xml_to_json()
        console.log('[Cron] Importation terminée avec succès ✅')
    } catch (error) {
        console.error('[Cron] Erreur lors de l\'importation des factures ❌', error)
    }
})