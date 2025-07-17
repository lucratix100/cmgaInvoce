import { BaseCommand } from '@adonisjs/core/ace'
import { DateTime } from 'luxon'
import Invoice from '#models/invoice'
import InvoiceRecoverySetting from '#models/invoice_recovery_setting'
import InvoiceRecoveryCustomSetting from '#models/invoice_recovery_custom_setting'

export default class UpdateUrgentInvoices extends BaseCommand {
  static commandName = 'update:urgent-invoices'
  static description = 'Met à jour le statut urgent des factures basé sur les délais de recouvrement'

  async run() {
    this.logger.info('Début de la mise à jour du statut urgent des factures...')

    try {
      // Récupérer tous les paramètres de recouvrement actifs
      const allRecoverySettings = await InvoiceRecoverySetting.query()
        .where('isActive', true)
        .preload('root')

      if (allRecoverySettings.length === 0) {
        this.logger.warning('Aucun délai de recouvrement configuré')
        return
      }

      // Récupérer le paramètre global (rootId = null)
      const globalSetting = allRecoverySettings.find(setting => setting.rootId === null)
      const defaultDays = globalSetting ? globalSetting.defaultDays : 30

      // Récupérer toutes les factures non payées
      const unpaidInvoices = await Invoice.query()
        .where('isPaid', false)
        .preload('recoveryCustomSettings')
        .preload('payments', (query) => {
          query.orderBy('paymentDate', 'desc')
        })

      let updatedCount = 0

      for (const invoice of unpaidInvoices) {
        const customSetting = invoice.recoveryCustomSettings[0]
        let daysThreshold: number
        
        if (customSetting) {
          daysThreshold = customSetting.customDays
        } else {
          const rootSetting = this.getRootSettingForInvoice(invoice, allRecoverySettings)
          daysThreshold = rootSetting ? rootSetting.defaultDays : defaultDays
        }
        
        const isUrgent = this.isInvoiceUrgent(invoice, daysThreshold)
        
        if (invoice.isUrgent !== isUrgent) {
          await invoice.merge({ isUrgent }).save()
          updatedCount++
          
          this.logger.info(`Facture ${invoice.invoiceNumber} mise à jour: isUrgent = ${isUrgent}`)
        }
      }

      this.logger.success(`${updatedCount} factures mises à jour avec succès`)

    } catch (error) {
      this.logger.error('Erreur lors de la mise à jour du statut urgent:', error)
    }
  }

  /**
   * Détermine si une facture est urgente basée sur le délai
   */
  private isInvoiceUrgent(invoice: Invoice, daysThreshold: number): boolean {
    // Déterminer la date de référence pour le calcul du délai
    let referenceDate: DateTime
    
    if (invoice.payments.length > 0) {
      // S'il y a des paiements, utiliser la date du dernier paiement
      const lastPayment = invoice.payments[0]
      referenceDate = lastPayment.paymentDate instanceof DateTime 
        ? lastPayment.paymentDate 
        : DateTime.fromJSDate(lastPayment.paymentDate)
    } else {
      // Sinon, utiliser la date de livraison
      referenceDate = invoice.deliveredAt instanceof DateTime 
        ? invoice.deliveredAt 
        : DateTime.fromJSDate(invoice.deliveredAt)
    }
    
    // Calculer la date limite pour cette facture
    const invoiceCutoffDate = DateTime.now().minus({ days: daysThreshold })
    
    // La facture est urgente si la date de référence est plus ancienne que le seuil
    return referenceDate < invoiceCutoffDate
  }

  /**
   * Récupère le paramètre de recouvrement pour la racine d'une facture
   */
  private getRootSettingForInvoice(invoice: Invoice, allSettings: InvoiceRecoverySetting[]): InvoiceRecoverySetting | null {
    // Extraire la racine du numéro de compte (premiers caractères)
    const accountNumber = invoice.accountNumber
    if (!accountNumber) return null

    // Chercher la racine correspondante
    for (const setting of allSettings) {
      if (setting.rootId && setting.root && accountNumber.startsWith(setting.root.name)) {
        return setting
      }
    }

    return null
  }
} 