import { BaseCommand } from '@adonisjs/core/ace'
import InvoiceRecoveryCustomSetting from '#models/invoice_recovery_custom_setting'
import Invoice from '#models/invoice'
import User from '#models/user'
import { Role } from '../enum/index.js'
import { DateTime } from 'luxon'
import NotificationService from '../services/notification_service.js'

export default class CheckExpiredCustomDelays extends BaseCommand {
  static commandName = 'check:expired-custom-delays'
  static description = 'Vérifie et supprime les délais personnalisés expirés et notifie les utilisateurs'

  async run() {
    this.logger.info('🔍 Début de la vérification des délais personnalisés expirés...')

    try {
      // Récupérer tous les délais personnalisés avec les informations de facture
      const customDelays = await InvoiceRecoveryCustomSetting.query()
        .preload('invoice', (query) => {
          query.preload('customer')
            .preload('payments', (paymentsQuery) => {
              paymentsQuery.orderBy('paymentDate', 'desc')
            })
        })

      let expiredCount = 0
      const expiredDelays: any[] = []

      for (const customDelay of customDelays) {
        const invoice = customDelay.invoice
        
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
        const invoiceCutoffDate = DateTime.now().minus({ days: customDelay.customDays })
        
        // Vérifier si le délai a expiré
        if (referenceDate < invoiceCutoffDate) {
          expiredDelays.push({
            customDelay,
            invoice,
            referenceDate: referenceDate.toISO(),
            cutoffDate: invoiceCutoffDate.toISO(),
            daysExpired: Math.floor(DateTime.now().diff(referenceDate, 'days').days) - customDelay.customDays
          })
        }
      }

      this.logger.info(`📊 ${expiredDelays.length} délai(s) personnalisé(s) expiré(s) trouvé(s)`)

      // Traiter chaque délai expiré
      for (const expiredData of expiredDelays) {
        const { customDelay, invoice, daysExpired } = expiredData
        
        try {
          // Supprimer le délai personnalisé expiré
          await customDelay.delete()
          expiredCount++

          this.logger.info(`🗑️ Délai personnalisé supprimé pour la facture ${invoice.invoiceNumber}`)

          // Notifier l'admin
          await NotificationService.notifyAdmins(
            '🚨 Délai personnalisé expiré',
            `Le délai personnalisé de ${customDelay.customDays} jours pour la facture ${invoice.invoiceNumber} a expiré depuis ${daysExpired} jour(s). Le délai a été supprimé automatiquement.`,
            invoice.id,
            {
              type: 'expired_custom_delay',
              invoiceNumber: invoice.invoiceNumber,
              customerName: invoice.customer?.name,
              customDays: customDelay.customDays,
              daysExpired
            }
          )

          // Notifier les utilisateurs de recouvrement affectés à cette facture
          await this.notifyRecoveryUsers(invoice, customDelay, daysExpired)

        } catch (error) {
          this.logger.error(`❌ Erreur lors du traitement du délai expiré pour la facture ${invoice.invoiceNumber}:`, error)
        }
      }

      this.logger.info(`✅ Vérification terminée. ${expiredCount} délai(s) personnalisé(s) supprimé(s)`)

    } catch (error) {
      this.logger.error('❌ Erreur lors de la vérification des délais personnalisés expirés:', error)
    }
  }

  /**
   * Notifie les utilisateurs de recouvrement affectés à une facture
   */
  private async notifyRecoveryUsers(invoice: Invoice, customDelay: InvoiceRecoveryCustomSetting, daysExpired: number) {
    try {
      // Récupérer tous les utilisateurs de recouvrement actifs
      const recoveryUsers = await User.query()
        .where('role', Role.RECOUVREMENT)
        .where('isActive', true)

      // Pour chaque utilisateur de recouvrement, vérifier s'il est affecté à cette facture
      for (const user of recoveryUsers) {
        let shouldNotify = false

        // Vérifier les affectations par dépôt
        if (user.depotId && user.depotId === invoice.depotId) {
          shouldNotify = true
        }

        // Vérifier les affectations par racine (pattern matching)
        if (!shouldNotify && user.assignments) {
          const accountNumber = invoice.accountNumber
          for (const assignment of user.assignments) {
            if (assignment.isActive && assignment.pattern) {
              // Vérifier si le numéro de compte correspond au pattern
              if (accountNumber.includes(assignment.pattern) || 
                  (accountNumber.startsWith('411') && accountNumber.substring(3).startsWith(assignment.pattern))) {
                shouldNotify = true
                break
              }
            }
          }
        }

        // Si l'utilisateur est affecté, créer une notification
        if (shouldNotify) {
          await this.createRecoveryUserNotification(user, invoice, customDelay, daysExpired)
        }
      }

    } catch (error) {
      this.logger.error('❌ Erreur lors de la notification des utilisateurs de recouvrement:', error)
    }
  }

  /**
   * Crée une notification pour un utilisateur de recouvrement
   */
  private async createRecoveryUserNotification(user: User, invoice: Invoice, customDelay: InvoiceRecoveryCustomSetting, daysExpired: number) {
    try {
      const InvoiceReminder = (await import('#models/invoice_reminder')).default
      
      const title = '🚨 Délai personnalisé expiré'
      const message = `Le délai personnalisé de ${customDelay.customDays} jours pour la facture ${invoice.invoiceNumber} a expiré depuis ${daysExpired} jour(s). Le délai a été supprimé automatiquement.`
      
      // Limiter le commentaire à 255 caractères
      const comment = `${title} - ${message}`.slice(0, 255)
      
      await InvoiceReminder.create({
        userId: Number(user.id),
        invoiceId: invoice.id,
        remindAt: DateTime.now(), // Notification immédiate
        comment,
        read: false
      })

      this.logger.info(`📢 Notification envoyée à l'utilisateur de recouvrement ${user.firstname} ${user.lastname}`)

    } catch (error) {
      this.logger.error(`❌ Erreur lors de la création de la notification pour l'utilisateur ${user.id}:`, error)
    }
  }
} 