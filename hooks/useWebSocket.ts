import { useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  type: 'text' | 'image' | 'file'
  fileUrl?: string
  isRead: boolean
  readAt?: string
  createdAt: string
  updatedAt: string
  sender: {
    id: string
    firstname: string
    lastname: string
  }
}

interface Conversation {
  id: string
  name?: string
  type: 'private' | 'group'
  createdBy: string
  createdAt: string
  updatedAt: string
  participants: Array<{
    id: string
    userId: string
    role: 'admin' | 'member'
    user: {
      id: string
      firstname: string
      lastname: string
      phone: string
    }
  }>
  messages: Message[]
}

interface UseWebSocketReturn {
  socket: any
  isConnected: boolean
  sendMessage: (conversationId: string, content: string, type?: 'text' | 'image' | 'file', fileUrl?: string) => void
  markAsRead: (conversationId: string) => void
  startTyping: (conversationId: string) => void
  stopTyping: (conversationId: string) => void
  onNewMessage: (callback: (message: Message) => void) => void
  onMessagesRead: (callback: (data: { conversationId: string; readBy: string }) => void) => void
  onUserTyping: (callback: (data: { conversationId: string; userId: string; userName: string; isTyping: boolean }) => void) => void
  onError: (callback: (error: { message: string }) => void) => void
}

export const useWebSocket = (): UseWebSocketReturn => {
  const { data: session } = useSession()
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<any>(null)
  const callbacksRef = useRef<{
    newMessage?: (message: Message) => void
    messagesRead?: (data: { conversationId: string; readBy: string }) => void
    userTyping?: (data: { conversationId: string; userId: string; userName: string; isTyping: boolean }) => void
    error?: (error: { message: string }) => void
  }>({})

  useEffect(() => {
    // Vérifier si nous avons un token d'accès
    const accessToken = (session as any)?.accessToken || (session as any)?.user?.accessToken
    
    if (!accessToken) return

    // Import dynamique de socket.io-client pour éviter les erreurs de build
    import('socket.io-client').then((socketIO) => {
      const io = socketIO.default || socketIO
      
      // Créer la connexion WebSocket en utilisant API_URL
      const socket = io(process.env.API_URL || 'http://192.168.10.10:3333', {
        auth: {
          token: accessToken
        },
        transports: ['websocket', 'polling']
      })

      socketRef.current = socket

      // Gérer les événements de connexion
      socket.on('connect', () => {
        console.log('Connecté au serveur WebSocket')
        setIsConnected(true)
      })

      socket.on('disconnect', () => {
        console.log('Déconnecté du serveur WebSocket')
        setIsConnected(false)
      })

      // Gérer les événements de chat
      socket.on('new_message', (data: { message: Message; conversationId: string }) => {
        if (callbacksRef.current.newMessage) {
          callbacksRef.current.newMessage(data.message)
        }
      })

      socket.on('messages_read', (data: { conversationId: string; readBy: string }) => {
        if (callbacksRef.current.messagesRead) {
          callbacksRef.current.messagesRead(data)
        }
      })

      socket.on('user_typing', (data: { conversationId: string; userId: string; userName: string; isTyping: boolean }) => {
        if (callbacksRef.current.userTyping) {
          callbacksRef.current.userTyping(data)
        }
      })

      socket.on('error', (error: { message: string }) => {
        if (callbacksRef.current.error) {
          callbacksRef.current.error(error)
        }
      })
    })

    // Nettoyer la connexion
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [session])

  const sendMessage = useCallback((conversationId: string, content: string, type: 'text' | 'image' | 'file' = 'text', fileUrl?: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('send_message', {
        conversationId,
        content,
        type,
        fileUrl
      })
    }
  }, [isConnected])

  const markAsRead = useCallback((conversationId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('mark_as_read', { conversationId })
    }
  }, [isConnected])

  const startTyping = useCallback((conversationId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing_start', { conversationId })
    }
  }, [isConnected])

  const stopTyping = useCallback((conversationId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing_stop', { conversationId })
    }
  }, [isConnected])

  const onNewMessage = useCallback((callback: (message: Message) => void) => {
    callbacksRef.current.newMessage = callback
  }, [])

  const onMessagesRead = useCallback((callback: (data: { conversationId: string; readBy: string }) => void) => {
    callbacksRef.current.messagesRead = callback
  }, [])

  const onUserTyping = useCallback((callback: (data: { conversationId: string; userId: string; userName: string; isTyping: boolean }) => void) => {
    callbacksRef.current.userTyping = callback
  }, [])

  const onError = useCallback((callback: (error: { message: string }) => void) => {
    callbacksRef.current.error = callback
  }, [])

  return {
    socket: socketRef.current,
    isConnected,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    onNewMessage,
    onMessagesRead,
    onUserTyping,
    onError
  }
} 