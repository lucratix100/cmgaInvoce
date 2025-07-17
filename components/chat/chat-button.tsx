'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle, Maximize2 } from 'lucide-react'
import { useChat } from './chat-provider'
import { Badge } from '@/components/ui/badge'

export default function ChatButton() {
  const { isChatOpen, isChatMinimized, openChat, maximizeChat, unreadMessages } = useChat()

  // Calculer le total des messages non lus
  const totalUnread = Object.values(unreadMessages || {}).reduce((sum: number, count: number) => sum + count, 0)

  if (isChatOpen) {
    return null // Le bouton est caché quand le chat est ouvert
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Button
        onClick={isChatMinimized ? maximizeChat : openChat}
        size="lg"
        className="rounded-full w-14 h-14 shadow-lg bg-blue-500/30 hover:bg-blue-600 relative"
      >
        {isChatMinimized ? (
          <Maximize2 className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}

        {/* Badge de notification */}
        {totalUnread > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold"
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </Badge>
        )}
      </Button>
    </div>
  )
} 