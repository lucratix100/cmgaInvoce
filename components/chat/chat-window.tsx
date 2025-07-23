'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Send, Users, MessageCircle, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getSession, getUser } from '@/lib/auth'
import io, { Socket } from 'socket.io-client'

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

interface ChatWindowProps {
  user: any
  accessToken: string
}

export default function ChatWindow({ user, accessToken }: ChatWindowProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [conversationName, setConversationName] = useState('')
  const [conversationType, setConversationType] = useState<'private' | 'group'>('private')
  const [currentUser, setCurrentUser] = useState<any>(user)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<ReturnType<typeof io> | null>(null)

  // Charger les conversations
  useEffect(() => {
    if (accessToken) {
      fetchConversations()
    }
  }, [accessToken])

  // Charger les utilisateurs
  useEffect(() => {
    if (accessToken) {
      fetchUsers()
    }
  }, [accessToken])

  // Charger les messages quand une conversation est sélectionnée
  useEffect(() => {
    if (selectedConversation && accessToken) {
      fetchMessages(selectedConversation.id)
    }
  }, [selectedConversation, accessToken])

  // Scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Ajout du useEffect pour la connexion WebSocket et l'écoute des nouveaux messages
  useEffect(() => {
    if (!selectedConversation || !accessToken) return

    // Connexion au WebSocket
    socketRef.current = io('http://192.168.10.10:3333/chat', {
      auth: { token: accessToken }
    })

    // Rejoindre la room de la conversation
    socketRef.current.emit('join', selectedConversation.id)

    // Écouter les nouveaux messages
    socketRef.current.on('new_message', (data: { conversationId: string, message: Message }) => {
      if (data.conversationId === selectedConversation.id) {
        setMessages((prev) => [...prev, data.message])
      }
    })

    // Nettoyage à la désélection ou démontage
    return () => {
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [selectedConversation, accessToken])

  const fetchConversations = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setConversations(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/chat/users', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setMessages(data.data || [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: newMessage,
          type: 'text'
        })
      })

      if (response.ok) {
        setNewMessage('')
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error)
    }
  }

  const createConversation = async () => {
    if (conversationType === 'private' && selectedUsers.length !== 1) {
      alert('Une conversation privée doit avoir exactement 2 participants')
      return
    }

    if (conversationType === 'group' && (!conversationName || selectedUsers.length < 2)) {
      alert('Une conversation de groupe doit avoir un nom et au moins 2 participants')
      return
    }

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          type: conversationType,
          name: conversationType === 'group' ? conversationName : undefined,
          participantIds: selectedUsers
        })
      })

      if (response.ok) {
        const conversation = await response.json()
        setConversations(prev => [conversation, ...prev])
        setSelectedConversation(conversation)
        setShowNewConversation(false)
        setSelectedUsers([])
        setConversationName('')
      }
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
    
    const otherParticipant = conversation.participants.find(
      p => p.user.id !== currentUser?.id
    )
    return otherParticipant ? `${otherParticipant.user.firstname} ${otherParticipant.user.lastname}` : 'Conversation'
  }

  const getLastMessage = (conversation: Conversation) => {
    return conversation.messages[0]?.content || 'Aucun message'
  }

  if (!accessToken || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Connexion requise
          </h3>
          <p className="text-gray-500">
            Veuillez vous connecter pour accéder au chat
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar des conversations */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Messages</h2>
            <Button
              size="sm"
              onClick={() => setShowNewConversation(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nouveau
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedConversation?.id === conversation.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>
                      {conversation.type === 'group' ? (
                        <Users className="w-5 h-5" />
                      ) : (
                        <MessageCircle className="w-5 h-5" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm truncate">
                        {getConversationName(conversation)}
                      </h3>
                      <Badge variant={conversation.type === 'group' ? 'secondary' : 'default'} className="text-xs">
                        {conversation.type === 'group' ? 'Groupe' : 'Privé'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {getLastMessage(conversation)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Zone principale du chat */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header de la conversation */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback>
                    {selectedConversation.type === 'group'
                      ? <Users className="w-5 h-5" />
                      : <MessageCircle className="w-5 h-5" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">
                    {getConversationName(selectedConversation)}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedConversation.participants.length} participant(s)
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollAreaRef} className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender.id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${message.sender.id === currentUser?.id ? 'order-2' : 'order-1'}`}>
                      <div className={`p-3 rounded-lg ${
                        message.sender.id === currentUser?.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender.id === currentUser?.id
                            ? 'text-blue-100'
                            : 'text-gray-500'
                        }`}>
                          {format(new Date(message.createdAt), 'HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-end ${message.sender.id === currentUser?.id ? 'order-1' : 'order-2'}`}>
                      <Avatar className="w-8 h-8 ml-2">
                        <AvatarFallback className="text-xs">
                          {`${message.sender.firstname[0]}${message.sender.lastname[0]}`}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Zone de saisie */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Tapez votre message..."
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Sélectionnez une conversation
              </h3>
              <p className="text-gray-500">
                Choisissez une conversation pour commencer à discuter
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal nouvelle conversation */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Nouvelle conversation</CardTitle>
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
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium">
                  Participants {conversationType === 'private' ? '(1)' : '(2+)'}
                </label>
                <ScrollArea className="h-32 mt-2 border rounded-md p-2">
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
                      className={`p-2 rounded cursor-pointer ${
                        selectedUsers.includes(user.id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {`${user.firstname[0]}${user.lastname[0]}`}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {user.firstname} {user.lastname}
                        </span>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewConversation(false)
                    setSelectedUsers([])
                    setConversationName('')
                  }}
                >
                  Annuler
                </Button>
                <Button onClick={createConversation}>
                  Créer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 