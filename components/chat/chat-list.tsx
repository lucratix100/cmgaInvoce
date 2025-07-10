'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Users, MessageCircle, Plus, Search } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

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

interface ChatListProps {
  onSelectConversation: (conversation: Conversation) => void
  selectedConversationId?: string
}

export default function ChatList({ onSelectConversation, selectedConversationId }: ChatListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [conversationName, setConversationName] = useState('')
  const [conversationType, setConversationType] = useState<'private' | 'group'>('private')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [accessToken, setAccessToken] = useState<string>('')

  // Charger les données d'authentification
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setAccessToken(data.accessToken)
          setCurrentUser(data.user)
        } else {
          console.error('Erreur d\'authentification:', response.status)
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données d\'authentification:', error)
      }
    }

    loadAuthData()
  }, [])

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
        onSelectConversation(conversation)
        setShowNewConversation(false)
        setSelectedUsers([])
        setConversationName('')
      }
    } catch (error) {
      console.error('Erreur lors de la création de la conversation:', error)
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

  const getLastMessageTime = (conversation: Conversation) => {
    if (!conversation.messages[0]) return ''
    return format(new Date(conversation.messages[0].createdAt), 'HH:mm', { locale: fr })
  }

  const filteredConversations = conversations.filter(conversation => {
    const name = getConversationName(conversation).toLowerCase()
    return name.includes(searchTerm.toLowerCase())
  })

  if (!accessToken || !currentUser) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Connexion requise
          </h3>
          <p className="text-xs text-gray-500">
            Veuillez vous connecter pour accéder au chat
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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
        
        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher des conversations..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Liste des conversations */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Chargement...</div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">
                {searchTerm ? 'Aucune conversation trouvée' : 'Aucune conversation'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <Card
                key={conversation.id}
                className={`mb-2 cursor-pointer transition-all hover:shadow-md ${
                  selectedConversationId === conversation.id
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => onSelectConversation(conversation)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback>
                        {conversation.type === 'group' ? (
                          <Users className="w-6 h-6" />
                        ) : (
                          <MessageCircle className="w-6 h-6" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-sm truncate">
                          {getConversationName(conversation)}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant={conversation.type === 'group' ? 'secondary' : 'default'} className="text-xs">
                            {conversation.type === 'group' ? 'Groupe' : 'Privé'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {getLastMessageTime(conversation)}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-500 truncate">
                        {getLastMessage(conversation)}
                      </p>
                      
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-gray-400">
                          {conversation.participants.length} participant(s)
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Modal nouvelle conversation */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Nouvelle conversation</h3>
              
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
                            {user.firstname[0]}{user.lastname[0]}
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