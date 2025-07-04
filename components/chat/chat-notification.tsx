'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageCircle, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ChatNotificationProps {
  className?: string
}

export default function ChatNotification({ className }: ChatNotificationProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotification, setShowNotification] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)

  useEffect(() => {
    if (!session) return

    // Charger les statistiques de chat
    fetchChatStats()

    // Polling pour les nouvelles notifications
    const interval = setInterval(fetchChatStats, 30000) // Vérifier toutes les 30 secondes

    return () => clearInterval(interval)
  }, [session])

  const fetchChatStats = async () => {
    try {
      const response = await fetch('/api/chat/stats', {
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unreadCount || 0)
        
        // Afficher une notification si il y a de nouveaux messages
        if (data.unreadCount > 0 && !showNotification) {
          setShowNotification(true)
          // Masquer la notification après 5 secondes
          setTimeout(() => setShowNotification(false), 5000)
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques de chat:', error)
    }
  }

  const handleChatClick = () => {
    router.push('/chat')
  }

  const handleCloseNotification = () => {
    setShowNotification(false)
  }

  if (!session) return null

  return (
    <div className={className}>
      {/* Badge de notification */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleChatClick}
        className="relative"
      >
        <MessageCircle className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification toast */}
      {showNotification && unreadCount > 0 && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 max-w-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              <div>
                <h4 className="font-medium text-sm">Nouveaux messages</h4>
                <p className="text-xs text-gray-500">
                  Vous avez {unreadCount} message{unreadCount > 1 ? 's' : ''} non lu{unreadCount > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseNotification}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Button
            size="sm"
            onClick={handleChatClick}
            className="w-full mt-3"
          >
            Voir les messages
          </Button>
        </div>
      )}
    </div>
  )
} 