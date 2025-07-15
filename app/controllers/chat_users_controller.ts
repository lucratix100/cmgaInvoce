import { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class ChatUsersController {
  /**
   * Récupérer la liste des utilisateurs disponibles pour le chat
   */
  async index({ auth, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const search = request.input('search', '')

      const users = await User.query()
        .where('id', '!=', user.id) // Exclure l'utilisateur connecté
        .where('is_active', true)
        .where((query) => {
          if (search) {
            query
              .where('firstname', 'like', `%${search}%`)
              .orWhere('lastname', 'like', `%${search}%`)
              .orWhere('phone', 'like', `%${search}%`)
          }
        })
        .select('id', 'firstname', 'lastname', 'phone', 'email', 'role')
        .orderBy('firstname', 'asc')

      return response.ok(users)
    } catch (error) {
      return response.internalServerError({ error: 'Erreur lors de la récupération des utilisateurs' })
    }
  }

  /**
   * Récupérer les statistiques de chat pour l'utilisateur connecté
   */
  async stats({ auth, response }: HttpContext) {
    try {
      const user = auth.user!
      
      const stats = await User.query()
        .where('id', user.id)
        .preload('conversationParticipants', (query) => {
          query.preload('conversation', (convQuery) => {
            convQuery.preload('messages', (msgQuery) => {
              msgQuery.where('sender_id', '!=', user.id)
              msgQuery.where('is_read', false)
            })
          })
        })
        .first()

      if (!stats) {
        return response.notFound({ error: 'Utilisateur non trouvé' })
      }

      const unreadCount = stats.conversationParticipants.reduce((total, participant) => {
        return total + participant.conversation.messages.length
      }, 0)

      const totalConversations = stats.conversationParticipants.length

      return response.ok({
        unreadCount,
        totalConversations,
        conversations: stats.conversationParticipants.map(participant => ({
          id: participant.conversation.id,
          name: participant.conversation.name,
          type: participant.conversation.type,
          unreadMessages: participant.conversation.messages.length
        }))
      })
    } catch (error) {
      return response.internalServerError({ error: 'Erreur lors de la récupération des statistiques' })
    }
  }
} 