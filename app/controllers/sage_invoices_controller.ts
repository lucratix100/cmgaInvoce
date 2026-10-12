import type { HttpContext } from '@adonisjs/core/http'
import SageInvoiceImportService from '#services/sage_invoice_import_service'
import { Role } from '../enum/index.js'

export default class SageInvoicesController {
    /**
     * Déclenche manuellement l'import des factures Sage (réservé aux admins).
     */
    async invoice_xml_to_json({ auth, response }: HttpContext) {
        if (auth.user?.role !== Role.ADMIN) {
            return response.forbidden({ success: false, message: 'Accès réservé aux administrateurs' })
        }
        try {
            const result = await SageInvoiceImportService.run()
            if (!result) {
                return response.conflict({ success: false, message: 'Un import est déjà en cours' })
            }
            return { success: true, message: 'Importation des factures terminée', ...result }
        } catch (error) {
            console.error('Erreur lors de l\'importation des factures:', error)
            return response.internalServerError({ success: false, message: 'Erreur lors de l\'importation des factures', error: error.message })
        }
    }
}
