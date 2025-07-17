import { BaseCommand } from '@adonisjs/core/ace'
import InvoiceRecoverySetting from '#models/invoice_recovery_setting'

export default class SetupRecoveryDefaults extends BaseCommand {
  static commandName = 'setup:recovery-defaults'
  static description = 'Configure les paramètres de recouvrement par défaut'

  async run() {
    this.logger.info('Configuration des paramètres de recouvrement par défaut...')

    try {
      // Vérifier s'il existe déjà un paramètre global
      const existingGlobal = await InvoiceRecoverySetting.query()
        .where('rootId', null)
        .first()

      if (!existingGlobal) {
        // Créer un paramètre global par défaut
        await InvoiceRecoverySetting.create({
          rootId: null,
          defaultDays: 30,
          isActive: true
        })
        this.logger.success('Paramètre global de recouvrement créé avec succès (30 jours)')
      } else {
        this.logger.info('Paramètre global de recouvrement déjà existant')
      }

      this.logger.success('Configuration terminée avec succès')

    } catch (error) {
      this.logger.error('Erreur lors de la configuration:', error)
    }
  }
} 