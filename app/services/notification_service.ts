import InvoiceReminder from '#models/invoice_reminder'
import User from '#models/user'
import { Role } from '../enum/index.js'
import { DateTime } from 'luxon'

export default class NotificationService {
  static async notifyUser(
    userId: number,
    title: string,
    message: string,
    invoiceId?: number,
    _details?: any
  ) {
    try {
      const comment = `${title} - ${message}`.slice(0, 255)
      await InvoiceReminder.create({
        userId,
        invoiceId: invoiceId || undefined,
        remindAt: DateTime.now(),
        comment,
        read: false
      })
    } catch (error) {
      console.error('Erreur lors de la notification utilisateur:', error)
    }
  }

  static async notifyRole(
    role: Role,
    title: string,
    message: string,
    invoiceId?: number,
    _details?: any
  ) {
    try {
      const users = await User.query()
        .where('role', role)
        .where('isActive', true)

      const notificationPromises = users.map(user => {
        const comment = `${title} - ${message}`.slice(0, 255)
        return InvoiceReminder.create({
          userId: Number(user.id),
          invoiceId: invoiceId || undefined,
          remindAt: DateTime.now(),
          comment,
          read: false
        })
      })

      await Promise.all(notificationPromises)
    } catch (error) {
      console.error('Erreur lors de la notification par rôle:', error)
    }
  }

  static async notifyRoleExcept(
    role: Role,
    excludedUserId: number | null,
    title: string,
    message: string,
    invoiceId?: number,
    _details?: any
  ) {
    try {
      const query = User.query()
        .where('role', role)
        .where('isActive', true)

      if (excludedUserId) {
        query.whereNot('id', excludedUserId)
      }

      const users = await query
      const notificationPromises = users.map(user => {
        const comment = `${title} - ${message}`.slice(0, 255)
        return InvoiceReminder.create({
          userId: Number(user.id),
          invoiceId: invoiceId || undefined,
          remindAt: DateTime.now(),
          comment,
          read: false
        })
      })

      await Promise.all(notificationPromises)
    } catch (error) {
      console.error('Erreur lors de la notification par rôle avec exclusion:', error)
    }
  }

  /**
   * Crée une notification pour tous les admins
   */
  static async notifyAdmins(
    title: string,
    message: string,
    invoiceId?: number,
    _details?: any
  ) {
    try {
      // Récupérer tous les utilisateurs admin
      const adminUsers = await User.query()
        .where('role', Role.ADMIN)
        .where('isActive', true)

      // Créer une notification pour chaque admin
      const notificationPromises = adminUsers.map(adminUser => {
        // Limiter le commentaire à 255 caractères
        const comment = `${title} - ${message}`.slice(0, 255)
        return InvoiceReminder.create({
          userId: Number(adminUser.id),
          invoiceId: invoiceId || undefined,
          remindAt: DateTime.now(), // Notification immédiate
          comment,
          read: false
        })
      })

      await Promise.all(notificationPromises)
      console.log(`Notifications créées pour ${adminUsers.length} administrateurs`)
    } catch (error) {
      console.error('Erreur lors de la création des notifications:', error)
    }
  }

  /**
   * Notifie les admins uniquement pour les actions importantes (BLs validés et paiements recouvrement)
   */
  static async notifyAdminsForImportantActions(
    title: string,
    message: string,
    invoiceId?: number,
    _details?: any
  ) {
    try {
      // Récupérer tous les utilisateurs admin
      const adminUsers = await User.query()
        .where('role', Role.ADMIN)
        .where('isActive', true)

      // Créer une notification pour chaque admin
      const notificationPromises = adminUsers.map(adminUser => {
        // Limiter le commentaire à 255 caractères
        const comment = `${title} - ${message}`.slice(0, 255)
        return InvoiceReminder.create({
          userId: Number(adminUser.id),
          invoiceId: invoiceId || undefined,
          remindAt: DateTime.now(), // Notification immédiate
          comment,
          read: false
        })
      })

      await Promise.all(notificationPromises)
      console.log(`Notifications importantes créées pour ${adminUsers.length} administrateurs`)
    } catch (error) {
      console.error('Erreur lors de la création des notifications importantes:', error)
    }
  }

  /**
   * Notifie les admins d'une validation de BL
   */
  static async notifyBlValidation(
    blNumber: string,
    invoiceNumber: string,
    customerName: string,
    validatedBy: string,
    status: string,
    invoiceId?: number
  ) {
    const title = '📦 BL validé'
    
    // Adapter le message selon le statut
    let action = 'validé'
    if (status === 'en attente de confirmation') {
      action = 'préparé'
    }
    
    const message = `Le BL de la facture ${invoiceNumber} a été ${action} par ${validatedBy} (${status})`
    const details = {
      blNumber,
      invoiceNumber,
      customerName,
      validatedBy,
      status,
      type: 'bl_validated'
    }

    await this.notifyAdminsForImportantActions(title, message, invoiceId, details)
  }

  /**
   * Notifie les admins d'un paiement ajouté par un utilisateur recouvrement
   */
  static async notifyRecouvrementPayment(
    paymentAmount: number,
    paymentMethod: string,
    invoiceNumber: string,
    customerName: string,
    createdBy: string,
    invoiceId?: number
  ) {
    const title = '💰 Paiement recouvrement'
    const message = `Un paiement de ${paymentAmount} FCFA a été ajouté par ${createdBy} (${paymentMethod})`
    const details = {
      amount: paymentAmount,
      method: paymentMethod,
      invoiceNumber,
      customerName,
      createdBy,
      type: 'recouvrement_payment'
    }

    await this.notifyAdminsForImportantActions(title, message, invoiceId, details)
  }

  /**
   * Notifie les admins d'une modification de paiement par un utilisateur recouvrement
   */
  static async notifyRecouvrementPaymentUpdate(
    paymentAmount: number,
    paymentMethod: string,
    invoiceNumber: string,
    customerName: string,
    modifiedBy: string,
    invoiceId?: number
  ) {
    const title = '✏️ Paiement modifié'
    const message = `Un paiement de ${paymentAmount} FCFA a été modifié par ${modifiedBy} (${paymentMethod})`
    const details = {
      amount: paymentAmount,
      method: paymentMethod,
      invoiceNumber,
      customerName,
      modifiedBy,
      type: 'recouvrement_payment_update'
    }

    await this.notifyAdminsForImportantActions(title, message, invoiceId, details)
  }

  /**
   * Notifie les admins d'une suppression de paiement par un utilisateur recouvrement
   */
  static async notifyRecouvrementPaymentDelete(
    paymentAmount: number,
    paymentMethod: string,
    invoiceNumber: string,
    customerName: string,
    deletedBy: string,
    invoiceId?: number
  ) {
    const title = '🗑️ Paiement supprimé'
    const message = `Un paiement de ${paymentAmount} FCFA a été supprimé par ${deletedBy} (${paymentMethod})`
    const details = {
      amount: paymentAmount,
      method: paymentMethod,
      invoiceNumber,
      customerName,
      deletedBy,
      type: 'recouvrement_payment_delete'
    }

    await this.notifyAdminsForImportantActions(title, message, invoiceId, details)
  }

  /**
   * Notifie les admins d'une création de BL (DÉPRÉCIÉ - maintenant seulement dans les activités)
   */
  static async notifyBlCreation(
    blNumber: string,
    _driverName: string,
    _invoiceNumber: string,
    _customerName: string,
    createdBy: string
  ) {
    // Cette méthode ne notifie plus les admins, seulement enregistrée dans les activités
    console.log(`BL créé: ${blNumber} par ${createdBy} - Enregistré dans les activités uniquement`)
  }

  /**
   * Notifie les admins d'un enregistrement de paiement (DÉPRÉCIÉ - maintenant seulement dans les activités)
   */
  static async notifyPaymentCreation(
    paymentAmount: number,
    _paymentMethod: string,
    _invoiceNumber: string,
    _customerName: string,
    createdBy: string
  ) {
    // Cette méthode ne notifie plus les admins, seulement enregistrée dans les activités
    console.log(`Paiement créé: ${paymentAmount} FCFA par ${createdBy} - Enregistré dans les activités uniquement`)
  }

  /**
   * Notifie les admins d'une modification importante de facture (DÉPRÉCIÉ - maintenant seulement dans les activités)
   */
  static async notifyInvoiceStatusChange(
    invoiceNumber: string,
    _oldStatus: string,
    _newStatus: string,
    _customerName: string,
    modifiedBy: string
  ) {
    // Cette méthode ne notifie plus les admins, seulement enregistrée dans les activités
    console.log(`Statut facture modifié: ${invoiceNumber} par ${modifiedBy} - Enregistré dans les activités uniquement`)
  }

  /**
   * Notifie les admins d'une création d'utilisateur (DÉPRÉCIÉ - maintenant seulement dans les activités)
   */
  static async notifyUserCreation(
    newUserEmail: string,
    _newUserRole: string,
    createdBy: string
  ) {
    // Cette méthode ne notifie plus les admins, seulement enregistrée dans les activités
    console.log(`Utilisateur créé: ${newUserEmail} par ${createdBy} - Enregistré dans les activités uniquement`)
  }

  /**
   * Notifie les admins d'une suppression d'utilisateur (DÉPRÉCIÉ - maintenant seulement dans les activités)
   */
  static async notifyUserDeletion(
    deletedUserEmail: string,
    _deletedUserRole: string,
    deletedBy: string
  ) {
    // Cette méthode ne notifie plus les admins, seulement enregistrée dans les activités
    console.log(`Utilisateur supprimé: ${deletedUserEmail} par ${deletedBy} - Enregistré dans les activités uniquement`)
  }
} 