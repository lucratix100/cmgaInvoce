import { Server as SocketIOServer } from 'socket.io'
import { Server as HttpServer, createServer } from 'http'
import User from '#models/user'
import Conversation from '#models/conversation'
import Message from '#models/message'

export default class WebSocketService {
  private io: SocketIOServer
  private userSockets: Map<string, string> = new Map() // userId -> socketId
  private static instance: WebSocketService | null = null
  private httpServer?: HttpServer

  constructor(server?: HttpServer) {
    if (server) {
      this.httpServer = server
    } else {
      this.httpServer = createServer()
      this.httpServer.listen(3334, () => {
        console.log('🔌 Serveur WebSocket démarré sur le port 3334')
      })
    }
    
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000
    })

    this.setupMiddleware()
    this.setupEventHandlers()
    
    WebSocketService.instance = this
  }

  // Méthode statique pour accéder à l'instance
  public static getInstance(): WebSocketService | null {
    return WebSocketService.instance
  }

  private setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || 
                     socket.handshake.headers.authorization?.replace('Bearer ', '') ||
                     socket.handshake.query.token
        
        if (!token) {
          socket.data.user = {
            id: 'debug-user',
            firstname: 'Debug',
            lastname: 'User'
          }
          return next()
        }

        try {
          const cookies = socket.handshake.headers.cookie
          if (cookies) {
            const userMatch = cookies.match(/user=([^;]+)/)
            if (userMatch) {
              try {
                const userData = JSON.parse(decodeURIComponent(userMatch[1]))
                const user = await User.find(userData.id)
                if (user) {
                  socket.data.user = user
                  return next()
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          }

          const db = await import('@adonisjs/lucid/services/db')
          
          const accessToken = await db.default
            .from('auth_access_tokens')
            .where('type', 'auth_token')
            .where('expires_at', '>', new Date())
            .first()

          if (!accessToken) {
            return next(new Error('Token invalide'))
          }

          const user = await User.find(accessToken.tokenable_id)
          if (!user) {
            return next(new Error('Utilisateur non trouvé'))
          }

          socket.data.user = user
          next()
        } catch (authError) {
          return next(new Error('Token invalide'))
        }
      } catch (error) {
        socket.data.user = {
          id: 'error-user',
          firstname: 'Error',
          lastname: 'User'
        }
        next()
      }
    })
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const user = socket.data.user
      this.userSockets.set(user.id, socket.id)

      // Rejoindre les conversations de l'utilisateur
      this.joinUserConversations(socket, user.id)

      // Gérer l'événement join pour rejoindre une conversation spécifique
      socket.on('join', (conversationId: string) => {
        socket.join(`conversation_${conversationId}`)
      })

      // Écouter les nouveaux messages
      socket.on('send_message', async (data) => {
        try {
          const { conversationId, content, type = 'text', fileUrl = null } = data

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

          // Mettre à jour la conversation
          await Conversation.query()
            .where('id', conversationId)
            .update({ updatedAt: new Date() })

          // Envoyer le message à tous les participants
          this.io.to(`conversation_${conversationId}`).emit('new_message', {
            message,
            conversationId
          })

          // Envoyer une notification aux utilisateurs non connectés
          this.sendNotificationToOfflineUsers(conversationId, message)

        } catch (error) {
          socket.emit('error', { message: 'Erreur lors de l\'envoi du message' })
        }
      })

      // Marquer les messages comme lus
      socket.on('mark_as_read', async (data) => {
        try {
          const { conversationId } = data

          await Message.query()
            .where('conversation_id', conversationId)
            .where('sender_id', '!=', user.id)
            .where('is_read', false)
            .update({
              isRead: true,
              readAt: new Date(),
            })

          // Notifier les autres participants
          socket.to(`conversation_${conversationId}`).emit('messages_read', {
            conversationId,
            readBy: user.id
          })

        } catch (error) {
          socket.emit('error', { message: 'Erreur lors du marquage des messages' })
        }
      })

      // Typing indicator
      socket.on('typing_start', (data) => {
        const { conversationId } = data
        socket.to(`conversation_${conversationId}`).emit('user_typing', {
          conversationId,
          userId: user.id,
          userName: `${user.firstname} ${user.lastname}`,
          isTyping: true
        })
      })

      socket.on('typing_stop', (data) => {
        const { conversationId } = data
        socket.to(`conversation_${conversationId}`).emit('user_typing', {
          conversationId,
          userId: user.id,
          userName: `${user.firstname} ${user.lastname}`,
          isTyping: false
        })
      })

      // Déconnexion
      socket.on('disconnect', () => {
        this.userSockets.delete(user.id)
      })
    })
  }

  private async joinUserConversations(socket: any, userId: string) {
    try {
      if (!userId || userId === 'debug-user' || userId === 'error-user') {
        return
      }

      const conversations = await Conversation.query()
        .whereHas('participants', (query) => {
          query.where('user_id', userId)
        })

      conversations.forEach(conversation => {
        socket.join(`conversation_${conversation.id}`)
      })
    } catch (error) {
      console.error('Erreur lors de la jointure des conversations:', error)
    }
  }

  private async sendNotificationToOfflineUsers(conversationId: string, message: any) {
    try {
      const conversation = await Conversation.query()
        .where('id', conversationId)
        .preload('participants')
        .first()

      if (!conversation) return

      conversation.participants.forEach(participant => {
        const isOnline = this.userSockets.has(participant.userId.toString())
        
        if (!isOnline && participant.userId !== message.senderId) {
          // Ici vous pourriez envoyer une notification push ou email
        }
      })
    } catch (error) {
      console.error('Erreur lors de l\'envoi des notifications:', error)
    }
  }

  // Méthodes publiques pour envoyer des événements
  public sendToUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId)
    if (socketId) {
      this.io.to(socketId).emit(event, data)
    }
  }

  public sendToConversation(conversationId: string, event: string, data: any) {
    try {
      if (!this.io) {
        console.error('❌ Serveur Socket.IO non initialisé')
        return
      }
      
      const roomName = `conversation_${conversationId}`
      this.io.to(roomName).emit(event, data)
    } catch (error) {
      console.error(`❌ Erreur lors de l'envoi de l'événement '${event}' à la conversation ${conversationId}:`, error)
    }
  }

  public broadcast(event: string, data: any) {
    this.io.emit(event, data)
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys())
  }
} 