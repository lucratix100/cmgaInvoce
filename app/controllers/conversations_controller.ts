import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Conversation from '#models/conversation'
import ConversationParticipant from '#models/conversation_participant'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

export default class ConversationsController {
  /**
   * Récupérer toutes les conversations de l'utilisateur connecté
   */
  async index({ auth, response }: HttpContext) {
    try {
      const user = auth.user!
      
      const conversations = await Conversation.query()
        .whereHas('participants', (query) => {
          query.where('user_id', user.id)
        })
        .preload('participants', (query) => {
          query.preload('user', (userQuery) => {
            userQuery.select('id', 'firstname', 'lastname', 'phone')
          })
        })
        .preload('messages', (query) => {
          query.orderBy('created_at', 'desc').limit(1)
        })
        .orderBy('updated_at', 'desc')

      return response.ok(conversations)
    } catch (error) {
      return response.internalServerError({ error: 'Erreur lors de la récupération des conversations' })
    }
  }

  /**
   * Créer une nouvelle conversation
   */
  async store({ auth, request, response }: HttpContext) {
    try {
      // Vérifier l'authentification
      if (!auth.user) {
        return response.unauthorized({ error: 'Utilisateur non authentifié' })
      }

      const user = auth.user
      const { type, name, participantIds } = request.only(['type', 'name', 'participantIds'])

      console.log('=== DEBUG SERVER ===')
      console.log('User:', { id: user.id, firstname: user.firstname, lastname: user.lastname })
      console.log('Request data:', { type, name, participantIds })
      console.log('===================')

      // Validation
      if (type === 'private' && participantIds.length !== 1) {
        return response.badRequest({ error: 'Une conversation privée doit avoir exactement 2 participants' })
      }

      if (type === 'group' && (!name || participantIds.length < 2)) {
        return response.badRequest({ error: 'Une conversation de groupe doit avoir un nom et au moins 2 participants' })
      }

      // Vérifier si une conversation privée existe déjà
      if (type === 'private') {
        const existingConversation = await Conversation.query()
          .where('type', 'private')
          .whereHas('participants', (query) => {
            query.where('user_id', user.id)
          })
          .whereHas('participants', (query) => {
            query.where('user_id', participantIds[0])
          })
          .first()

        if (existingConversation) {
          return response.ok(existingConversation)
        }
      }

      // Créer la conversation
      const conversation = await Conversation.create({
        name: type === 'group' ? name : null,
        type,
        createdBy: user.id,
      })

      // Ajouter les participants
      const participants = [
        { userId: user.id, role: 'admin', joinedAt: DateTime.now() },
        ...participantIds.map((id: number) => ({
          userId: id,
          role: type === 'group' ? 'member' : 'member',
          joinedAt: DateTime.now(),
        })),
      ]

      await conversation.related('participants').createMany(participants)

      // Charger les relations
      await conversation.load('participants', (query) => {
        query.preload('user', (userQuery) => {
          userQuery.select('id', 'firstname', 'lastname', 'phone')
        })
      })

      return response.created(conversation)
    } catch (error) {
      console.error('=== ERREUR SERVER ===')
      console.error('Erreur complète:', error)
      console.error('====================')
      return response.internalServerError({ error: 'Erreur lors de la création de la conversation' })
    }
  }

  /**
   * Récupérer les détails d'une conversation
   */
  async show({ auth, params, response }: HttpContext) {
    try {
      const user = auth.user!
      const { id } = params

      const conversation = await Conversation.query()
        .where('id', id)
        .whereHas('participants', (query) => {
          query.where('user_id', user.id)
        })
        .preload('participants', (query) => {
          query.preload('user', (userQuery) => {
            userQuery.select('id', 'firstname', 'lastname', 'phone')
          })
        })
        .preload('messages', (query) => {
          query.preload('sender', (senderQuery) => {
            senderQuery.select('id', 'firstname', 'lastname')
          })
          query.orderBy('created_at', 'asc')
        })
        .first()

      if (!conversation) {
        return response.notFound({ error: 'Conversation non trouvée' })
      }

      return response.ok(conversation)
    } catch (error) {
      return response.internalServerError({ error: 'Erreur lors de la récupération de la conversation' })
    }
  }

  /**
   * Ajouter des participants à une conversation de groupe
   */
  async addParticipants({ auth, params, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const { id } = params
      const { participantIds } = request.only(['participantIds'])

      const conversation = await Conversation.query()
        .where('id', id)
        .where('type', 'group')
        .whereHas('participants', (query) => {
          query.where('user_id', user.id).where('role', 'admin')
        })
        .first()

      if (!conversation) {
        return response.forbidden({ error: 'Vous n\'avez pas les permissions pour ajouter des participants' })
      }

      const participants = participantIds.map((participantId: number) => ({
        conversationId: id,
        userId: participantId,
        role: 'member',
        joinedAt: DateTime.now(),
      }))

      await ConversationParticipant.createMany(participants)

      return response.ok({ message: 'Participants ajoutés avec succès' })
    } catch (error) {
      return response.internalServerError({ error: 'Erreur lors de l\'ajout des participants' })
    }
  }

  /**
   * Supprimer un participant d'une conversation de groupe
   */
  async removeParticipant({ auth, params, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const { id } = params
      const { participantId } = request.only(['participantId'])

      const conversation = await Conversation.query()
        .where('id', id)
        .where('type', 'group')
        .whereHas('participants', (query) => {
          query.where('user_id', user.id).where('role', 'admin')
        })
        .first()

      if (!conversation) {
        return response.forbidden({ error: 'Vous n\'avez pas les permissions pour supprimer des participants' })
      }

      await ConversationParticipant.query()
        .where('conversation_id', id)
        .where('user_id', participantId)
        .delete()

      return response.ok({ message: 'Participant supprimé avec succès' })
    } catch (error) {
      return response.internalServerError({ error: 'Erreur lors de la suppression du participant' })
    }
  }
} 