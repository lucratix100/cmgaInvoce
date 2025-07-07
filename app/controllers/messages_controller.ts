import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Message from '#models/message'
import Conversation from '#models/conversation'
import ConversationParticipant from '#models/conversation_participant'
import { inject } from '@adonisjs/core'
import WebSocketService from '#services/websocket_service'

@inject()
export default class MessagesController {
  /**
   * Récupérer les messages d'une conversation
   */
  async index({ auth, params, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const { conversationId } = params
      const page = request.input('page', 1)
      const limit = request.input('limit', 50)

      // Vérifier que l'utilisateur participe à la conversation
      const participant = await ConversationParticipant.query()
        .where('conversation_id', conversationId)
        .where('user_id', user.id)
        .first()

      if (!participant) {
        return response.forbidden({ error: 'Vous n\'avez pas accès à cette conversation' })
      }

      // Récupérer les messages
      const messages = await Message.query()
        .where('conversation_id', conversationId)
        .preload('sender', (query) => {
          query.select('id', 'firstname', 'lastname')
        })
        .orderBy('created_at', 'desc')
        .paginate(page, limit)

      // Marquer les messages comme lus
      await Message.query()
        .where('conversation_id', conversationId)
        .where('sender_id', '!=', user.id)
        .where('is_read', false)
        .update({
          isRead: true,
          readAt: DateTime.now(),
        })

      return response.ok(messages)
    } catch (error) {
      return response.internalServerError({ error: 'Erreur lors de la récupération des messages' })
    }
  }

  /**
   * Envoyer un nouveau message
   */
  async store({ auth, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const { conversationId, content, type = 'text', fileUrl = null } = request.only([
        'conversationId',
        'content',
        'type',
        'fileUrl',
      ])

      // Vérifier que l'utilisateur participe à la conversation
      const participant = await ConversationParticipant.query()
        .where('conversation_id', conversationId)
        .where('user_id', user.id)
        .first()

      if (!participant) {
        return response.forbidden({ error: 'Vous n\'avez pas accès à cette conversation' })
      }

      // Créer le message
      const message = await Message.create({
        conversationId,
        senderId: user.id,
        content,
        type,
        fileUrl,
        isRead: false,
      })

      // Charger les relations
      await message.load('sender', (query) => {
        query.select('id', 'firstname', 'lastname')
      })

      // Mettre à jour la date de modification de la conversation
      await Conversation.query()
        .where('id', conversationId)
        .update({ updatedAt: DateTime.now() })

      // Émettre l'événement WebSocket pour les messages en temps réel
      try {
        console.log('🔌 Tentative d\'émission WebSocket pour conversation:', conversationId)
        
        // Essayer plusieurs fois d'obtenir le service WebSocket
        let websocketService = null
        let attempts = 0
        const maxAttempts = 3
        
        while (!websocketService && attempts < maxAttempts) {
          attempts++
          console.log(`🔍 Tentative ${attempts}/${maxAttempts} d'obtention du service WebSocket...`)
          websocketService = WebSocketService.getInstance()
          
          if (!websocketService) {
            console.log(`⏳ Service WebSocket non trouvé, attente de 500ms...`)
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
        
        console.log('🔌 Service WebSocket trouvé:', !!websocketService)
        
        if (websocketService) {
          websocketService.sendToConversation(conversationId.toString(), 'new_message', {
            message: message,
            conversationId: conversationId.toString()
          })
          console.log('✅ Événement WebSocket émis avec succès')
        } else {
          console.log('❌ Service WebSocket non disponible après plusieurs tentatives')
          console.log('⚠️ Le message a été sauvegardé mais ne sera pas diffusé en temps réel')
        }
      } catch (websocketError) {
        console.error('❌ Erreur lors de l\'émission WebSocket:', websocketError)
        console.log('⚠️ Le message a été sauvegardé mais ne sera pas diffusé en temps réel')
        // Ne pas faire échouer la requête si WebSocket échoue
      }

      return response.created(message)
    } catch (error) {
      return response.internalServerError({ error: 'Erreur lors de l\'envoi du message' })
    }
  }

  /**
   * Marquer un message comme lu
   */
  async markAsRead({ auth, params, response }: HttpContext) {
    try {
      const user = auth.user!
      const { id } = params

      const message = await Message.query()
        .where('id', id)
        .where('sender_id', '!=', user.id)
        .first()

      if (!message) {
        return response.notFound({ error: 'Message non trouvé' })
      }

      // Vérifier que l'utilisateur participe à la conversation
      const participant = await ConversationParticipant.query()
        .where('conversation_id', message.conversationId)
        .where('user_id', user.id)
        .first()

      if (!participant) {
        return response.forbidden({ error: 'Vous n\'avez pas accès à cette conversation' })
      }

      message.isRead = true
      message.readAt = DateTime.now()
      await message.save()

      return response.ok({ message: 'Message marqué comme lu' })
    } catch (error) {
      return response.internalServerError({ error: 'Erreur lors du marquage du message' })
    }
  }

  /**
   * Marquer tous les messages d'une conversation comme lus
   */
  async markConversationAsRead({ auth, params, response }: HttpContext) {
    try {
      const user = auth.user!
      const { conversationId } = params

      // Vérifier que l'utilisateur participe à la conversation
      const participant = await ConversationParticipant.query()
        .where('conversation_id', conversationId)
        .where('user_id', user.id)
        .first()

      if (!participant) {
        return response.forbidden({ error: 'Vous n\'avez pas accès à cette conversation' })
      }

      // Marquer tous les messages non lus comme lus
      await Message.query()
        .where('conversation_id', conversationId)
        .where('sender_id', '!=', user.id)
        .where('is_read', false)
        .update({
          isRead: true,
          readAt: DateTime.now(),
        })

      return response.ok({ message: 'Conversation marquée comme lue' })
    } catch (error) {
      return response.internalServerError({ error: 'Erreur lors du marquage de la conversation' })
    }
  }

  /**
   * Supprimer un message (seulement pour l'expéditeur)
   */
  async destroy({ auth, params, response }: HttpContext) {
    try {
      const user = auth.user!
      const { id } = params

      const message = await Message.query()
        .where('id', id)
        .where('sender_id', user.id)
        .first()

      if (!message) {
        return response.notFound({ error: 'Message non trouvé ou vous n\'avez pas les permissions' })
      }

      await message.delete()

      return response.ok({ message: 'Message supprimé avec succès' })
    } catch (error) {
      return response.internalServerError({ error: 'Erreur lors de la suppression du message' })
    }
  }
} 