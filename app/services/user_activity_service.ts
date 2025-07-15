import UserActivitie from '#models/user_activitie'
import type { HttpContext } from '@adonisjs/core/http'

export default class UserActivityService {
  /**
   * Enregistre une activité utilisateur
   */
  static async logActivity(
    userId: number,
    action: string,
    role: string,
    invoiceId?: number,
    details?: any
  ) {
    try {
      await UserActivitie.create({
        userId,
        action,
        role,
        invoiceId: invoiceId || undefined,
        details: details || null,
      })
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'activité:', error)
    }
  }

  /**
   * Enregistre une activité depuis un contexte HTTP
   */
  static async logActivityFromContext(
    ctx: HttpContext,
    action: string,
    invoiceId?: number,
    details?: any
  ) {
    try {
      const user = await ctx.auth.authenticate()
      await this.logActivity(
        Number(user.id),
        action,
        user.role,
        invoiceId,
        details
      )
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'activité depuis le contexte:', error)
    }
  }

  /**
   * Actions prédéfinies pour la cohérence
   */
  static readonly ACTIONS = {
    LOGIN: 'Connexion',
    LOGOUT: 'Déconnexion',
    CREATE_INVOICE: 'Création facture',
    UPDATE_INVOICE: 'Modification facture',
    DELETE_INVOICE: 'Suppression facture',
    SCAN_INVOICE: 'Scan facture',
    DELIVER_INVOICE: 'Livraison facture',
    CREATE_USER: 'Création utilisateur',
    UPDATE_USER: 'Modification utilisateur',
    DELETE_USER: 'Suppression utilisateur',
    CREATE_DRIVER: 'Création conducteur',
    UPDATE_DRIVER: 'Modification conducteur',
    DELETE_DRIVER: 'Suppression conducteur',
    CREATE_DEPOT: 'Création dépôt',
    UPDATE_DEPOT: 'Modification dépôt',
    DELETE_DEPOT: 'Suppression dépôt',
    CREATE_PAYMENT: 'Création paiement',
    UPDATE_PAYMENT: 'Modification paiement',
    DELETE_PAYMENT: 'Suppression paiement',
    CREATE_BL: 'Création BL',
    UPDATE_BL: 'Modification BL',
    DELETE_BL: 'Suppression BL',
    CONFIRM_DELIVERY: 'Confirmation livraison',
    PROCESS_DELIVERY: 'Traitement livraison',
  } as const
} 