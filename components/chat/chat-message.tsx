'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Send, Paperclip, Image, File } from 'lucide-react'
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

interface ChatMessageProps {
  conversation: Conversation
  onMessageSent?: (message: Message) => void
}

export default function ChatMessage({ conversation, onMessageSent }: ChatMessageProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [accessToken, setAccessToken] = useState<string>('')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Charger les messages quand la conversation change
  useEffect(() => {
    if (conversation && accessToken) {
      fetchMessages()
    }
  }, [conversation, accessToken])

  // Scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
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
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async (content: string, type: 'text' | 'image' | 'file' = 'text', fileUrl?: string) => {
    if (!content.trim() || !conversation) return

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          content,
          type,
          fileUrl
        })
      })

      if (response.ok) {
        const message = await response.json()
        setMessages(prev => [...prev, message])
        setNewMessage('')
        
        if (onMessageSent) {
          onMessageSent(message)
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('conversationId', conversation.id)

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        const fileType = file.type.startsWith('image/') ? 'image' : 'file'
        const fileName = file.name
        
        await sendMessage(fileName, fileType, data.fileUrl)
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload du fichier:', error)
    }
  }

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const getConversationName = () => {
    if (conversation.type === 'group') {
      return conversation.name || 'Groupe'
    }
    
    const otherParticipant = conversation.participants.find(
      p => p.user.id !== currentUser?.id
    )
    return otherParticipant ? `${otherParticipant.user.firstname} ${otherParticipant.user.lastname}` : 'Conversation'
  }

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.sender.id === currentUser?.id

    return (
      <div
        key={message.id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
          <div className={`p-3 rounded-lg ${
            isOwnMessage
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}>
            {message.type === 'text' && (
              <p className="text-sm">{message.content}</p>
            )}
            
            {message.type === 'image' && (
              <div>
                <img 
                  src={message.fileUrl} 
                  alt="Image" 
                  className="max-w-full rounded"
                />
                <p className="text-sm mt-2">{message.content}</p>
              </div>
            )}
            
            {message.type === 'file' && (
              <div className="flex items-center gap-2">
                <File className="w-4 h-4" />
                <a 
                  href={message.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm underline hover:no-underline"
                >
                  {message.content}
                </a>
              </div>
            )}
            
            <p className={`text-xs mt-1 ${
              isOwnMessage
                ? 'text-blue-100'
                : 'text-gray-500'
            }`}>
              {format(new Date(message.createdAt), 'HH:mm', { locale: fr })}
            </p>
          </div>
        </div>
        
        <div className={`flex items-end ${isOwnMessage ? 'order-1' : 'order-2'}`}>
          <Avatar className="w-8 h-8 ml-2">
            <AvatarFallback className="text-xs">
              {message.sender.firstname[0]}{message.sender.lastname[0]}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    )
  }

  if (!accessToken || !currentUser) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Connexion requise</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header de la conversation */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="font-semibold text-lg">{getConversationName()}</h2>
        <p className="text-sm text-gray-500">
          {conversation.participants.length} participant(s)
        </p>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Chargement des messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Aucun message dans cette conversation</p>
            <p className="text-sm text-gray-400">Soyez le premier à envoyer un message !</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Zone de saisie */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(newMessage)}
            placeholder="Tapez votre message..."
            className="flex-1"
          />
          
          <Button 
            onClick={() => sendMessage(newMessage)} 
            disabled={!newMessage.trim()}
            className="flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
      </div>
    </div>
  )
} 