import { HttpContext } from '@adonisjs/core/http'
import Invoice from '#models/invoice'
import InvoiceRecoverySetting from '#models/invoice_recovery_setting'
import InvoiceRecoveryCustomSetting from '#models/invoice_recovery_custom_setting'
import Root from '#models/root'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

export default class InvoiceRecoveriesController {
  /**
   * Récupère les factures urgentes basées sur les délais de paiement
   */
  async getUrgentInvoices({ response, auth }: HttpContext) {
    try {
      const user = auth.user!
      console.log('USER:', user) // LOG utilisateur
      
      // Récupérer tous les paramètres de recouvrement actifs
      const allRecoverySettings = await InvoiceRecoverySetting.query()
        .where('isActive', true)
        .preload('root')

      if (allRecoverySettings.length === 0) {
        return response.json({
          success: false,
          error: 'Aucun délai de recouvrement configuré',
          message: 'Veuillez configurer un délai par défaut dans les paramètres de recouvrement',
          urgentInvoices: [],
          settings: null
        })
      }

      // Récupérer le paramètre global (rootId = null)
      const globalSetting = allRecoverySettings.find(setting => setting.rootId === null)
      const defaultDays = globalSetting ? globalSetting.defaultDays : 30

      console.log('Paramètres de recouvrement:', {
        allSettingsCount: allRecoverySettings.length,
        globalSetting: globalSetting ? { id: globalSetting.id, defaultDays: globalSetting.defaultDays } : null,
        defaultDays
      })

      // Récupérer toutes les factures non payées avec leurs BLs et paiements
      const unpaidInvoices = await Invoice.query()
        .whereNot('statusPayment', 'payé') // Exclure les factures complètement payées
        .preload('customer')
        .preload('depot')
        .preload('recoveryCustomSettings')
        .preload('bls', (query) => {
          query.where('status', 'validée').orderBy('createdAt', 'desc')
        })
        .preload('payments', (query) => {
          query.orderBy('paymentDate', 'desc')
        })

      console.log(`Factures non payées trouvées: ${unpaidInvoices.length}`)

      // Filtrer les factures urgentes
      const urgentInvoices = unpaidInvoices.filter(invoice => {
        // Ne considérer que les factures qui ont au moins un BL valide
        if (!invoice.bls || invoice.bls.length === 0) {
          console.log(`Facture ${invoice.invoiceNumber}: Aucun BL valide trouvé, ignorée`)
          return false
        }

        // Vérifier s'il y a un délai personnalisé pour cette facture
        const customSetting = invoice.recoveryCustomSettings[0]
        if (customSetting) {
          console.log(`Facture ${invoice.invoiceNumber} (${invoice.accountNumber}): Délai personnalisé ${customSetting.customDays} jours`)
          return this.isInvoiceUrgent(invoice, customSetting.customDays)
        }

        // Vérifier s'il y a un délai spécifique pour la racine de cette facture
        const rootSetting = this.getRootSettingForInvoice(invoice, allRecoverySettings)
        const daysThreshold = rootSetting ? rootSetting.defaultDays : defaultDays
        
        console.log(`Facture ${invoice.invoiceNumber} (${invoice.accountNumber}): Délai ${daysThreshold} jours ${rootSetting ? `(racine: ${rootSetting.root?.name})` : '(global)'}`)
        
        return this.isInvoiceUrgent(invoice, daysThreshold)
      })

      console.log(`Factures urgentes trouvées: ${urgentInvoices.length}`)

      // Mettre à jour le statut urgent des factures
      for (const invoice of unpaidInvoices) {
        // Ne considérer que les factures qui ont au moins un BL valide
        if (!invoice.bls || invoice.bls.length === 0) {
          // Si la facture n'a plus de BL valide mais était marquée comme urgente, la désactiver
          if (invoice.isUrgent) {
            await invoice.merge({ isUrgent: false }).save()
            console.log(`Facture ${invoice.invoiceNumber}: Statut urgent désactivé (aucun BL valide)`)
          }
          continue
        }

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
        }
      }

      return response.json({
        success: true,
        data: urgentInvoices,
        settings: {
          defaultDays,
          cutoffDate: DateTime.now().minus({ days: defaultDays }).toISO()
        }
      })

    } catch (error) {
      console.error('Erreur lors de la récupération des factures urgentes:', error)
      return response.status(500).json({
        error: 'Erreur interne du serveur',
        details: error.message
      })
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
      // Sinon, utiliser la date du dernier BL valide
      const lastValidBl = invoice.bls && invoice.bls.length > 0 ? invoice.bls[0] : null
      
      if (lastValidBl) {
        // Utiliser la date de création du dernier BL valide
        referenceDate = lastValidBl.createdAt instanceof DateTime 
          ? lastValidBl.createdAt 
          : DateTime.fromJSDate(lastValidBl.createdAt)
      } else {
        // Fallback sur deliveredAt si aucun BL valide n'existe
        referenceDate = invoice.deliveredAt instanceof DateTime 
          ? invoice.deliveredAt 
          : DateTime.fromJSDate(invoice.deliveredAt)
      }
    }
    
    // Calculer la date limite pour cette facture
    const invoiceCutoffDate = DateTime.now().minus({ days: daysThreshold })
    
    // Debug: Afficher les informations de calcul
    console.log(`Facture ${invoice.invoiceNumber}:`, {
      referenceDate: referenceDate.toISO(),
      cutoffDate: invoiceCutoffDate.toISO(),
      daysThreshold,
      isUrgent: referenceDate < invoiceCutoffDate,
      deliveredAt: invoice.deliveredAt,
      lastValidBlDate: invoice.bls && invoice.bls.length > 0 ? invoice.bls[0].createdAt : null,
      date: invoice.date,
      paymentsCount: invoice.payments.length,
      validBlsCount: invoice.bls ? invoice.bls.length : 0
    })
    
    // La facture est urgente si la date de référence est plus ancienne que le seuil
    return referenceDate < invoiceCutoffDate
  }

  /**
   * Récupère le paramètre de recouvrement pour la racine d'une facture
   */
  private getRootSettingForInvoice(invoice: Invoice, allSettings: InvoiceRecoverySetting[]): InvoiceRecoverySetting | null {
    // Extraire la racine du numéro de compte
    const accountNumber = invoice.accountNumber
    if (!accountNumber) return null

    console.log(`🔍 Recherche de racine pour le compte: ${accountNumber}`)
    console.log(`📋 Racines disponibles:`, allSettings.map(s => s.root?.name).filter(Boolean))

    // Chercher la racine correspondante
    for (const setting of allSettings) {
      if (setting.rootId && setting.root) {
        const rootName = setting.root.name
        console.log(`🔎 Test racine "${rootName}" contre compte "${accountNumber}"`)
        
        // Méthode 1: Vérifier si le numéro de compte contient le nom de la racine
        if (accountNumber.includes(rootName)) {
          console.log(`✅ Racine trouvée (méthode 1) pour ${accountNumber}: ${rootName} (délai: ${setting.defaultDays} jours)`)
          return setting
        }
        
        // Méthode 2: Extraire la racine après le préfixe 411
        if (accountNumber.startsWith('411')) {
          const extractedRoot = accountNumber.substring(3) // Enlever "411"
          console.log(`🔍 Racine extraite après 411: "${extractedRoot}"`)
          
          if (extractedRoot.startsWith(rootName)) {
            console.log(`✅ Racine trouvée (méthode 2) pour ${accountNumber}: ${rootName} (délai: ${setting.defaultDays} jours)`)
            return setting
          }
        }
        
        console.log(`❌ Racine "${rootName}" ne correspond pas au compte "${accountNumber}"`)
      }
    }

    console.log(`❌ Aucune racine trouvée pour le compte: ${accountNumber}`)
    return null
  }

  /**
   * Récupère les paramètres de recouvrement
   */
  async getRecoverySettings({ response, auth }: HttpContext) {
    try {
      const user = auth.user!
      
      let settings
      if (user.rootId) {
        settings = await InvoiceRecoverySetting.query()
          .where('rootId', user.rootId)
          .preload('root')
          .orderBy('id', 'asc')
      } else {
        settings = await InvoiceRecoverySetting.query()
          .preload('root')
          .orderBy('id', 'asc')
      }

      // Création automatique d'un délai global si aucun paramètre n'existe
      if (!settings || settings.length === 0) {
        const defaultSetting = await InvoiceRecoverySetting.create({
          rootId: null,
          defaultDays: 30,
          isActive: true
        })
        await defaultSetting.load('root')
        settings = [defaultSetting]
      }

      return response.json({
        success: true,
        settings: settings,
        message: settings.length === 0 ? 'Aucun délai de recouvrement configuré. Veuillez en créer un.' : null
      })

    } catch (error) {
      console.error('Erreur lors de la récupération des paramètres:', error)
      return response.status(500).json({
        error: 'Erreur interne du serveur'
      })
    }
  }

  /**
   * Récupère les délais par racine
   */
  async getRecoverySettingsByRoot({ response }: HttpContext) {
    try {
      const settings = await InvoiceRecoverySetting.query()
        .preload('root')
        .where('isActive', true)
        .orderBy('id', 'asc')

      // Récupérer aussi le paramètre global (rootId = null)
      const globalSetting = await InvoiceRecoverySetting.query()
        .where('rootId', null)
        .where('isActive', true)
        .first()

      return response.json({
        success: true,
        data: {
          global: globalSetting,
          byRoot: settings
        }
      })

    } catch (error) {
      console.error('Erreur lors de la récupération des délais par racine:', error)
      return response.status(500).json({
        error: 'Erreur interne du serveur'
      })
    }
  }

  /**
   * Crée un nouveau paramètre de recouvrement pour une racine
   */
  async createRecoverySetting({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { rootId, defaultDays, isActive } = request.only(['rootId', 'defaultDays', 'isActive'])

      // Vérifier que l'utilisateur est admin
      if (user.role !== 'ADMIN') {
        return response.status(403).json({
          error: 'Vous n\'avez pas les permissions pour créer des paramètres de recouvrement'
        })
      }

      // Vérifier si un paramètre existe déjà pour cette racine
      if (rootId) {
        const existingSetting = await InvoiceRecoverySetting.query()
          .where('rootId', rootId)
          .first()

        if (existingSetting) {
          return response.status(400).json({
            error: 'Un paramètre de recouvrement existe déjà pour cette racine'
          })
        }
      }

      const setting = await InvoiceRecoverySetting.create({
        rootId: rootId || null,
        defaultDays: defaultDays || 30,
        isActive: isActive ?? true
      })

      await setting.load('root')

      return response.json({
        success: true,
        setting: setting
      })

    } catch (error) {
      console.error('Erreur lors de la création du paramètre:', error)
      return response.status(500).json({
        error: 'Erreur interne du serveur'
      })
    }
  }

  /**
   * Met à jour les paramètres de recouvrement
   */
  async updateRecoverySettings({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { rootId, defaultDays, isActive } = request.only(['rootId', 'defaultDays', 'isActive'])

      let settings
      if (rootId !== undefined) {
        // Si rootId est fourni, chercher ou créer un paramètre pour cette racine
        settings = await InvoiceRecoverySetting.query()
          .where('rootId', rootId)
          .first()
      } else if (user.rootId) {
        // Sinon, utiliser le rootId de l'utilisateur
        settings = await InvoiceRecoverySetting.query()
          .where('rootId', user.rootId)
          .first()
      } else {
        // Sinon, chercher le paramètre global
        settings = await InvoiceRecoverySetting.query()
          .where('rootId', null)
          .first()
      }

      if (settings) {
        settings.merge({ defaultDays, isActive: isActive ?? true })
        await settings.save()
      } else {
        settings = await InvoiceRecoverySetting.create({
          rootId: rootId !== undefined ? rootId : (user.rootId || null),
          defaultDays,
          isActive: isActive ?? true
        })
      }

      // Recharger avec la relation root
      await settings.load('root')

      return response.json({
        success: true,
        setting: settings
      })

    } catch (error) {
      console.error('Erreur lors de la mise à jour des paramètres:', error)
      return response.status(500).json({
        error: 'Erreur interne du serveur'
      })
    }
  }

  /**
   * Met à jour le délai personnalisé pour une facture
   */
  async updateCustomDelay({ params, request, response }: HttpContext) {
    try {
      const { invoiceId } = params
      const { customDays } = request.only(['customDays'])

      // Vérifier que la facture existe
      const invoice = await Invoice.findOrFail(invoiceId)

      // Mettre à jour ou créer le paramètre personnalisé
      let customSetting = await InvoiceRecoveryCustomSetting.query()
        .where('invoiceId', invoiceId)
        .first()

      if (customSetting) {
        customSetting.merge({ customDays })
        await customSetting.save()
      } else {
        customSetting = await InvoiceRecoveryCustomSetting.create({
          invoiceId,
          customDays
        })
      }

      return response.json({
        success: true,
        data: customSetting
      })

    } catch (error) {
      console.error('Erreur lors de la mise à jour du délai personnalisé:', error)
      return response.status(500).json({
        error: 'Erreur interne du serveur'
      })
    }
  }

  /**
   * Met à jour le statut urgent de toutes les factures
   */
  async updateUrgentStatus({ response, auth }: HttpContext) {
    try {
      const user = auth.user!
      
      // Récupérer tous les paramètres de recouvrement actifs
      const allRecoverySettings = await InvoiceRecoverySetting.query()
        .where('isActive', true)
        .preload('root')

      if (allRecoverySettings.length === 0) {
        return response.json({
          success: false,
          error: 'Aucun délai de recouvrement configuré',
          message: 'Veuillez configurer un délai par défaut dans les paramètres de recouvrement',
          updatedCount: 0
        })
      }

      // Récupérer le paramètre global (rootId = null)
      const globalSetting = allRecoverySettings.find(setting => setting.rootId === null)
      const defaultDays = globalSetting ? globalSetting.defaultDays : 30

      // Récupérer toutes les factures non payées ET livrées avec leurs paramètres personnalisés et paiements
      const unpaidInvoices = await Invoice.query()
        .whereNot('statusPayment', 'payé') // Exclure les factures complètement payées
        .whereNotNull('deliveredAt') // Ne considérer que les factures livrées
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
        }
      }

      return response.json({
        success: true,
        message: `${updatedCount} factures mises à jour`,
        updatedCount
      })

    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut urgent:', error)
      return response.status(500).json({
        error: 'Erreur interne du serveur'
      })
    }
  }

  /**
   * Supprime un paramètre de recouvrement
   */
  async destroyRecoverySetting({ params, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { id } = params

      // Vérifier que l'utilisateur est admin
      if (user.role !== 'ADMIN') {
        return response.status(403).json({
          error: 'Vous n\'avez pas les permissions pour supprimer les paramètres de recouvrement'
        })
      }

      const setting = await InvoiceRecoverySetting.find(id)
      
      if (!setting) {
        return response.status(404).json({
          error: 'Paramètre de recouvrement non trouvé'
        })
      }

      // Empêcher la suppression du paramètre global s'il n'y en a qu'un seul
      if (setting.rootId === null) {
        const globalSettingsCount = await InvoiceRecoverySetting.query()
          .where('rootId', null)
          .count('* as count')
        
        if (globalSettingsCount[0].$extras.count <= 1) {
          return response.status(400).json({
            error: 'Impossible de supprimer le dernier paramètre global. Veuillez d\'abord créer un autre paramètre.'
          })
        }
      }

      await setting.delete()

      return response.json({
        success: true,
        message: 'Paramètre de recouvrement supprimé avec succès'
      })

    } catch (error) {
      console.error('Erreur lors de la suppression du paramètre:', error)
      return response.status(500).json({
        error: 'Erreur interne du serveur'
      })
    }
  }

  /**
   * Récupère toutes les racines disponibles
   */
  async getRoots({ response }: HttpContext) {
    try {
      const roots = await Root.all()
      
      return response.json({
        success: true,
        data: roots
      })

    } catch (error) {
      console.error('Erreur lors de la récupération des racines:', error)
      return response.status(500).json({
        error: 'Erreur interne du serveur'
      })
    }
  }

  /**
   * Méthode de test pour vérifier les données des factures
   */
  async testInvoices({ response }: HttpContext) {
    try {
      // Récupérer quelques factures non payées ET livrées pour test
      const testInvoices = await Invoice.query()
        .whereNot('statusPayment', 'payé') // Exclure les factures complètement payées
        .whereNotNull('deliveredAt') // Ne considérer que les factures livrées
        .limit(5)
        .preload('payments')

      const invoicesData = testInvoices.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date,
        deliveredAt: invoice.deliveredAt,
        statusPayment: invoice.statusPayment,
        paymentsCount: invoice.payments.length,
        lastPaymentDate: invoice.payments[0]?.paymentDate || null
      }))

      return response.json({
        success: true,
        data: invoicesData,
        total: testInvoices.length
      })

    } catch (error) {
      console.error('Erreur lors du test des factures:', error)
      return response.status(500).json({
        error: 'Erreur interne du serveur'
      })
    }
  }

  /**
   * Récupère tous les délais personnalisés des factures (non expirés)
   */
  async getCustomDelays({ response, auth }: HttpContext) {
    try {
      const user = auth.user!
      
      // Vérifier que l'utilisateur est admin
      if (user.role !== 'ADMIN') {
        return response.status(403).json({
          error: 'Vous n\'avez pas les permissions pour voir les délais personnalisés'
        })
      }

      const customDelays = await InvoiceRecoveryCustomSetting.query()
        .preload('invoice', (query) => {
          query.preload('customer')
            .preload('payments', (paymentsQuery) => {
              paymentsQuery.orderBy('paymentDate', 'desc')
            })
        })
        .orderBy('createdAt', 'desc')

      // Filtrer les délais expirés
      const activeCustomDelays = []
      
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
        
        // Ne garder que les délais non expirés
        if (referenceDate >= invoiceCutoffDate) {
          activeCustomDelays.push(customDelay)
        }
      }

      const formattedDelays = activeCustomDelays.map(delay => ({
        id: delay.id,
        customDays: delay.customDays,
        createdAt: delay.createdAt,
        updatedAt: delay.updatedAt,
        invoice: {
          id: delay.invoice.id,
          invoiceNumber: delay.invoice.invoiceNumber,
          accountNumber: delay.invoice.accountNumber,
          date: delay.invoice.date,
          totalTTC: delay.invoice.totalTTC,
          customer: delay.invoice.customer ? {
            name: delay.invoice.customer.name,
            accountNumber: delay.invoice.customer.accountNumber
          } : null
        }
      }))

      return response.json({
        success: true,
        data: formattedDelays,
        total: formattedDelays.length,
        expiredCount: customDelays.length - activeCustomDelays.length
      })

    } catch (error) {
      console.error('Erreur lors de la récupération des délais personnalisés:', error)
      return response.status(500).json({
        error: 'Erreur interne du serveur'
      })
    }
  }

  /**
   * Supprime un délai personnalisé
   */
  async deleteCustomDelay({ params, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const { id } = params

      // Vérifier que l'utilisateur est admin
      if (user.role !== 'ADMIN') {
        return response.status(403).json({
          error: 'Vous n\'avez pas les permissions pour supprimer les délais personnalisés'
        })
      }

      const customDelay = await InvoiceRecoveryCustomSetting.find(id)
      
      if (!customDelay) {
        return response.status(404).json({
          error: 'Délai personnalisé non trouvé'
        })
      }

      await customDelay.delete()

      return response.json({
        success: true,
        message: 'Délai personnalisé supprimé avec succès'
      })

    } catch (error) {
      console.error('Erreur lors de la suppression du délai personnalisé:', error)
      return response.status(500).json({
        error: 'Erreur interne du serveur'
      })
    }
  }

  /**
   * Exécute manuellement la vérification des délais personnalisés expirés
   */
  async checkExpiredDelays({ response, auth }: HttpContext) {
    try {
      const user = auth.user!
      
      // Vérifier que l'utilisateur est admin
      if (user.role !== 'ADMIN') {
        return response.status(403).json({
          error: 'Vous n\'avez pas les permissions pour exécuter cette action'
        })
      }

      // Importer et exécuter la tâche
      const CheckExpiredCustomDelays = (await import('../tasks/check_expired_custom_delays.js')).default
      const task = new CheckExpiredCustomDelays()
      
      // Exécuter la tâche
      await task.run()

      return response.json({
        success: true,
        message: 'Vérification des délais expirés exécutée avec succès'
      })

    } catch (error) {
      console.error('Erreur lors de la vérification des délais expirés:', error)
      return response.status(500).json({
        error: 'Erreur interne du serveur'
      })
    }
  }
} 