'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import ChatPopup from './chat-popup'

interface ChatContextType {
  isChatOpen: boolean
  isChatMinimized: boolean
  unreadMessages: Record<string, number>
  openChat: () => void
  closeChat: () => void
  minimizeChat: () => void
  maximizeChat: () => void
  setUnreadMessages: React.Dispatch<React.SetStateAction<Record<string, number>>>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}

interface ChatProviderProps {
  children: ReactNode
  user: any
  accessToken: string
  users: any[]
}

export function ChatProvider({ children, user, accessToken, users }: ChatProviderProps) {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isChatMinimized, setIsChatMinimized] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>({})

  const openChat = () => {
    setIsChatOpen(true)
    setIsChatMinimized(false)
  }

  const closeChat = () => {
    setIsChatOpen(false)
    setIsChatMinimized(false)
  }

  const minimizeChat = () => {
    setIsChatMinimized(true)
  }

  const maximizeChat = () => {
    setIsChatMinimized(false)
  }

  const value = {
    isChatOpen,
    isChatMinimized,
    unreadMessages,
    openChat,
    closeChat,
    minimizeChat,
    maximizeChat,
    setUnreadMessages,
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
      <ChatPopup
        isOpen={isChatOpen}
        isMinimized={isChatMinimized}
        onClose={closeChat}
        onMinimize={minimizeChat}
        user={user}
        accessToken={accessToken}
        users={users}
      />
    </ChatContext.Provider>
  )
} 