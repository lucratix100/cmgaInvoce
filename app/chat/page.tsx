import { getSession, getUser } from '@/lib/auth'
import ChatWindow from '@/components/chat/chat-window'

export default async function ChatPage() {
  const session = await getSession()
  const user = await getUser()
  return (
    <div className="h-screen">
      <ChatWindow user={user?.data || user} accessToken={session?.token} />
    </div>
  )
} 