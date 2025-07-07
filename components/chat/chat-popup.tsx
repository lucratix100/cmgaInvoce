'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageCircle, X, Send, Users, Plus, Minimize2, Maximize2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getConversations, createConversation, getConversationMessages } from '@/actions/conversations'
import { sendMessage } from '@/actions/messages'
import io, { Socket } from 'socket.io-client'
import { useChat } from './chat-provider'

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

interface User {
  id: string
  firstname: string
  lastname: string
  phone: string
  email?: string
  role: string
}

interface ChatPopupProps {
  isOpen: boolean
  onClose: () => void
  onMinimize: () => void
  isMinimized: boolean
  user: any
  accessToken: string
  users: User[]
}

export default function ChatPopup({ isOpen, onClose, onMinimize, isMinimized, user, accessToken, users }: ChatPopupProps) {
  const { unreadMessages, setUnreadMessages, maximizeChat } = useChat()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [conversationName, setConversationName] = useState('')
  const [conversationType, setConversationType] = useState<'private' | 'group'>('private')
  const [currentUser, setCurrentUser] = useState<any>(user)
  const [selectedUserForPrivate, setSelectedUserForPrivate] = useState<string>('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Charger les conversations
  useEffect(() => {
    if (accessToken) {
      fetchConversations()
    }
  }, [accessToken])

  // Charger les messages quand une conversation est sélectionnée
  useEffect(() => {
    if (selectedConversation && accessToken) {
      fetchMessages(selectedConversation.id)
      // Marquer les messages comme lus quand on ouvre la conversation
      markConversationAsRead(selectedConversation.id)
    }
  }, [selectedConversation, accessToken])

  // Surveiller les changements dans unreadMessages
  useEffect(() => {
    console.log('🔔 État des messages non lus:', unreadMessages)
    console.log('🔔 Total des messages non lus:', Object.values(unreadMessages).reduce((total, count) => total + count, 0))
  }, [unreadMessages])

  // Scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!accessToken) return

    const socket = io('http://localhost:3334', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      auth: {
        token: accessToken
      }
    })

    socket.on('connect', () => {
      setSocket(socket)
      console.log('🔌 WebSocket connecté')
    })

    socket.on('connect_error', (error: any) => {
      console.error('❌ Erreur de connexion WebSocket:', error)
    })

    socket.on('disconnect', (reason: string) => {
      setSocket(null)
      console.log('🔌 WebSocket déconnecté:', reason)
    })

    socket.on('error', (error: any) => {
      console.error('❌ Erreur WebSocket:', error)
    })

    // Rejoindre la conversation actuelle si elle existe
    if (selectedConversation) {
      socket.emit('join', selectedConversation.id)
      console.log('🔌 Rejoint la conversation:', selectedConversation.id)
    }

    socket.on('new_message', (data: { message: Message, conversationId: string }) => {
      console.log('📨 Nouveau message reçu:', data)
      console.log('📨 Conversation actuelle:', selectedConversation?.id, 'Type:', typeof selectedConversation?.id)
      console.log('📨 Conversation du message:', data.conversationId, 'Type:', typeof data.conversationId)
      
      const currentId = selectedConversation?.id
      const messageId = data.conversationId
      
      console.log('📨 Comparaison:', currentId, '==', messageId, '=', currentId == messageId)
      console.log('📨 Comparaison stricte:', currentId, '===', messageId, '=', currentId === messageId)
      
      // Si on est dans la conversation du message
      if (currentId == messageId) {
        console.log('✅ Message pour conversation actuelle')
        setMessages((prev) => {
          const messageExists = prev.some(msg => msg.id === data.message.id)
          if (messageExists) {
            return prev
          }
          return [...prev, data.message]
        })
      } else {
        // Message pour une autre conversation - toujours incrémenter le compteur
        console.log('🔔 Message pour autre conversation - incrémenter compteur')
        console.log('🔔 Compteur avant:', unreadMessages)
        setUnreadMessages((prev: Record<string, number>) => {
          const newUnread = {
            ...prev,
            [data.conversationId]: (prev[data.conversationId] || 0) + 1
          }
          console.log('🔔 Nouveau compteur:', newUnread)
          return newUnread
        })
      }
      // Rafraîchir la liste des conversations pour l'aperçu en temps réel
      fetchConversations();
    })

    // Écouter les nouvelles invitations de conversation
    socket.on('new_conversation_invitation', (data: {
      conversationId: string
      conversationName: string
      conversationType: 'private' | 'group'
      createdBy: {
        id: string
        firstname: string
        lastname: string
      }
      participants: any[]
    }) => {
      console.log('🎉 Nouvelle invitation de conversation reçue:', data)
      
      // Afficher une notification native du navigateur
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Nouvelle conversation', {
          body: `${data.createdBy.firstname} ${data.createdBy.lastname} vous a invité à rejoindre "${data.conversationName}"`,
          icon: '/favicon.ico',
          tag: `conversation-${data.conversationId}`
        })
      }
      
      // Mettre à jour la liste des conversations
      fetchConversations()
      
      // Afficher un toast/notification dans l'interface
      showNotificationToast(data)
    })

    return () => {
      socket?.disconnect()
      setSocket(null)
    }
  }, [accessToken, selectedConversation?.id])

  // Fonction pour afficher une notification toast
  const showNotificationToast = (data: any) => {
    // Créer un élément toast temporaire
    const toast = document.createElement('div')
    toast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-3 rounded-lg shadow-lg z-[9999] max-w-sm'
    toast.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          <MessageCircle class="w-5 h-5" />
        </div>
        <div class="flex-1">
          <h4 class="font-medium text-sm">Nouvelle conversation</h4>
          <p class="text-xs mt-1">${data.createdBy.firstname} ${data.createdBy.lastname} vous a invité à rejoindre "${data.conversationName}"</p>
        </div>
        <button class="flex-shrink-0 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
          <X class="w-4 h-4" />
        </button>
      </div>
    `
    
    document.body.appendChild(toast)
    
    // Supprimer automatiquement après 5 secondes
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove()
      }
    }, 5000)
  }

  // Demander la permission pour les notifications au premier chargement
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const fetchConversations = async () => {
    try {
      setIsLoading(true)
      const data = await getConversations()
      console.log('📋 Conversations reçues:', data)
      console.log('📋 Structure de la première conversation:', data[0])
      
      // Filtrer les doublons basés sur l'ID
      const uniqueConversations = data.filter((conversation: Conversation, index: number, self: Conversation[]) => 
        index === self.findIndex(c => c.id === conversation.id)
      )
      
      console.log('📋 Conversations uniques:', uniqueConversations)
      setConversations(uniqueConversations)
    } catch (error) {
      console.error('Erreur lors du chargement des conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      const data = await getConversationMessages(conversationId)
      setMessages(data.data || [])
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error)
    }
  }

  const sendMessageHandler = async () => {
    if (!newMessage.trim() || !selectedConversation || isSendingMessage) return

    try {
      setIsSendingMessage(true)
      const message = await sendMessage({
        conversationId: selectedConversation.id,
        content: newMessage,
        type: 'text'
      })
      // Ne pas ajouter le message ici car il sera ajouté via WebSocket
      // setMessages(prev => [...prev, message])
      setNewMessage('')
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error)
    } finally {
      setIsSendingMessage(false)
    }
  }

  const createConversationHandler = async () => {
    if (conversationType === 'private' && !selectedUserForPrivate) {
      alert('Veuillez sélectionner un utilisateur pour la conversation privée')
      return
    }

    if (conversationType === 'group' && (!conversationName || selectedUsers.length < 2)) {
      alert('Une conversation de groupe doit avoir un nom et au moins 2 participants')
      return
    }

    try {
      const participantIds = conversationType === 'private' 
        ? [selectedUserForPrivate] 
        : selectedUsers

      const conversation = await createConversation({
        type: conversationType,
        name: conversationType === 'group' ? conversationName : undefined,
        participantIds
      })
      
      setConversations(prev => [conversation, ...prev])
      setSelectedConversation(conversation)
      setShowNewConversation(false)
      setSelectedUsers([])
      setConversationName('')
      setSelectedUserForPrivate('')
    } catch (error) {
      console.error('Erreur lors de la création de la conversation:', error)
    }
  }

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const getConversationName = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      return conversation.name || 'Groupe'
    }
    
    if (!conversation.participants || conversation.participants.length === 0) {
      return 'Conversation'
    }
    
    const otherParticipant = conversation.participants.find(
      p => p.user.id !== currentUser?.id
    )
    return otherParticipant ? `${otherParticipant.user.firstname} ${otherParticipant.user.lastname}` : 'Conversation'
  }

  const getLastMessage = (conversation: Conversation) => {
    if (!conversation.messages || conversation.messages.length === 0) {
      return 'Aucun message'
    }
    return conversation.messages[0]?.content || 'Aucun message'
  }

  // Marquer une conversation comme lue
  const markConversationAsRead = (conversationId: string) => {
    setUnreadMessages((prev: Record<string, number>) => {
      const newUnread = { ...prev }
      delete newUnread[conversationId]
      return newUnread
    })
    
    // Émettre l'événement WebSocket pour marquer comme lu
    if (socket) {
      socket.emit('mark_as_read', { conversationId })
    }
  }

  // Aperçu du dernier message (contenu + heure)
  const getLastMessagePreview = (conversation: Conversation) => {
    if (!conversation.messages || conversation.messages.length === 0) {
      return <span className="text-xs text-gray-400">Aucun message</span>
    }
    // Chercher le message le plus récent
    const lastMsg = conversation.messages.reduce((a, b) =>
      new Date(a.createdAt) > new Date(b.createdAt) ? a : b
    )
    return (
      <span className="text-xs text-gray-500 flex items-center gap-2">
        <span className="truncate max-w-[120px]">{lastMsg.content}</span>
        <span className="text-[10px] text-gray-400">{format(new Date(lastMsg.createdAt), 'HH:mm')}</span>
      </span>
    )
  }

  if (!isOpen) return null

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-80 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                <span className="font-medium">Chat</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={maximizeChat}
                  className="h-6 w-6 p-0"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!accessToken || !currentUser) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-96 h-96 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                <span className="font-medium">Chat</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMinimize}
                  className="h-6 w-6 p-0"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Connexion requise</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  return (
    <div className="fixed bottom-10 right-8 z-50 w-[380px] h-[500px] flex flex-col rounded-2xl shadow-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Motif SVG discret façon WhatsApp, plus visible */}
      <svg
        className="absolute inset-0 w-full h-full z-0"
        style={{ opacity: 0.25 }}
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="whatsappPattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="8" cy="8" r="1.5" fill="#a0a0a0" />
            <rect x="18" y="18" width="2" height="2" rx="1" fill="#a0a0a0" />
            <circle cx="24" cy="10" r="1" fill="#a0a0a0" />
            <rect x="6" y="22" width="2" height="2" rx="1" fill="#a0a0a0" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#whatsappPattern)" />
      </svg>
      <Card className="flex-1 flex flex-col bg-transparent shadow-none border-none h-full relative z-10">
        <CardHeader className="pb-2 bg-blue-50 rounded-t-2xl border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                {Object.values(unreadMessages).reduce((total, count) => total + count, 0) > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 text-xs px-1.5 py-0.5 min-w-[18px] h-4"
                  >
                    {Object.values(unreadMessages).reduce((total, count) => total + count, 0) > 99 
                      ? '99+' 
                      : Object.values(unreadMessages).reduce((total, count) => total + count, 0)
                    }
                  </Badge>
                )}
              </div>
              <span className="font-medium">Chat</span>
              {selectedConversation && (
                <Badge variant="secondary" className="text-xs">
                  {selectedConversation.type === 'group' ? 'Groupe' : 'Privé'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onMinimize}
                className="h-6 w-6 p-0"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 h-0 min-h-0">
          {!selectedConversation ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-4 border-b flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Conversations</h3>
                  <Button
                    size="sm"
                    onClick={() => setShowNewConversation(true)}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Nouveau
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1 min-h-0 h-0">
                <div className="p-2">
                  {conversations.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Aucune conversation</p>
                    </div>
                  ) : (
                    conversations.map((conversation, index) => (
                      <div
                        key={`conversation-${conversation.id}-${index}`}
                        onClick={() => setSelectedConversation(conversation)}
                        className="p-2 rounded-lg cursor-pointer transition-colors hover:bg-blue-100 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">
                              {conversation.type === 'group' ? (
                                <Users className="w-4 h-4" />
                              ) : (
                                <MessageCircle className="w-4 h-4" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">
                              {getConversationName(conversation)}
                            </h4>
                            <div className="flex items-center gap-1">
                              {getLastMessagePreview(conversation)}
                            </div>
                          </div>
                          {unreadMessages[conversation.id] && unreadMessages[conversation.id] > 0 && (
                            <Badge variant="destructive" className="text-xs px-1.5 py-0.5 min-w-[20px] h-5">
                              {unreadMessages[conversation.id] > 99 ? '99+' : unreadMessages[conversation.id]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-3 border-b bg-gray-50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {selectedConversation.type === 'group' ? (
                          <Users className="w-3 h-3" />
                        ) : (
                          <MessageCircle className="w-3 h-3" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">
                      {getConversationName(selectedConversation)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedConversation(null)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0 h-0 p-3">
                <div className="space-y-2 pb-4">
                  {sortedMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender.id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs ${message.sender.id === currentUser?.id ? 'order-2' : 'order-1'}`}>
                        {/* Nom de l'expéditeur (seulement pour les autres utilisateurs) */}
                        {message.sender.id !== currentUser?.id && (
                          <div className="mb-1">
                            <p className="text-xs font-medium text-gray-600">
                              {message.sender.firstname} {message.sender.lastname}
                            </p>
                          </div>
                        )}
                        <div className={`p-2 rounded-lg text-xs ${
                          message.sender.id === currentUser?.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p>{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender.id === currentUser?.id
                              ? 'text-blue-100'
                              : 'text-gray-500'
                          }`}>
                            {format(new Date(message.createdAt), 'HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="flex-shrink-0 p-3 pb-2 border-t bg-white">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !isSendingMessage) {
                        e.preventDefault()
                        sendMessageHandler()
                      }
                    }}
                    placeholder="Tapez votre message..."
                    className="flex-1 text-sm"
                    disabled={isSendingMessage}
                  />
                  <Button 
                    onClick={sendMessageHandler} 
                    disabled={!newMessage.trim() || isSendingMessage} 
                    size="sm"
                  >
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        {showNewConversation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-80">
              <CardHeader>
                <CardTitle className="text-lg">Nouvelle conversation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Type de conversation</label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={conversationType === 'private' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setConversationType('private')}
                    >
                      Privée
                    </Button>
                    <Button
                      variant={conversationType === 'group' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setConversationType('group')}
                    >
                      Groupe
                    </Button>
                  </div>
                </div>

                {conversationType === 'group' && (
                  <div>
                    <label className="text-sm font-medium">Nom du groupe</label>
                    <Input
                      value={conversationName}
                      onChange={(e) => setConversationName(e.target.value)}
                      placeholder="Nom du groupe"
                      className="text-sm"
                    />
                  </div>
                )}

                {conversationType === 'private' ? (
                  <div>
                    <label className="text-sm font-medium">Sélectionner un utilisateur</label>
                    <Select value={selectedUserForPrivate} onValueChange={setSelectedUserForPrivate}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Choisir un utilisateur" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-4 h-4">
                                <AvatarFallback className="text-xs">
                                  {user.firstname[0]}{user.lastname[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span>{user.firstname} {user.lastname}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-medium">Participants (2+)</label>
                    <ScrollArea className="h-24 mt-2 border rounded-md p-2">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => {
                            if (selectedUsers.includes(user.id)) {
                              setSelectedUsers(prev => prev.filter(id => id !== user.id))
                            } else {
                              setSelectedUsers(prev => [...prev, user.id])
                            }
                          }}
                          className={`p-2 rounded cursor-pointer text-sm ${
                            selectedUsers.includes(user.id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="w-4 h-4">
                              <AvatarFallback className="text-xs">
                                {user.firstname[0]}{user.lastname[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.firstname} {user.lastname}</span>
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowNewConversation(false)
                      setSelectedUsers([])
                      setConversationName('')
                      setSelectedUserForPrivate('')
                    }}
                  >
                    Annuler
                  </Button>
                  <Button size="sm" onClick={createConversationHandler}>
                    Créer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Card>
    </div>
  )
} 