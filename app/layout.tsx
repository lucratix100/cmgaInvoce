import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from "@/components/ui/sonner"
import { getCurrentUser } from '@/actions/user'
import Header from '@/components/navbar/navbar'
import SideBar from '@/components/side-bar'
import { Role } from '@/types/roles'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import QueryProvider from '@/components/providers/query-provider'
import { ChatProvider } from '@/components/chat/chat-provider'
import ChatButton from '@/components/chat/chat-button'
import { getChatUsers } from '@/actions/chatUsers'

export const metadata: Metadata = {
  title: process.env.NODE_ENV === 'development' ? 'DEV MODE' : 'CMGA Delivery',
  description: 'Suivi livraisons CMGA',
  generator: 'CMGA Delivery',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CMGA Delivery',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  const { token } = await getSession()

  // Charger les utilisateurs seulement si connecté
  let users: any[] = []
  if (token && user) {
    try {
      users = await getChatUsers()
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error)
      users = []
    }
  }

  console.log(token, "token layout")

  return (
    <html lang="fr">
      <body>
        <QueryProvider>
          {token && user ? (
            <ChatProvider user={user} accessToken={token} users={users}>
              <div className="flex min-h-screen">
                {/* Sidebar */}
                {user && user.role === Role.ADMIN && <SideBar />}
                {/* Main content */}
                <div className="flex-1">
                  {/* Header */}
                  <header className="border-b bg-white shadow-sm sticky top-0 z-40">
                    <Header user={user} />
                  </header>
                  <main className="p-4 md:p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
                    {children}
                  </main>
                </div>
              </div>
              {/* Chat Button - visible seulement si l'utilisateur est connecté */}
              <ChatButton />
              <Toaster richColors />
            </ChatProvider>
          ) : (
            <>
              <main className="p-4 md:p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
                {children}
              </main>
              <Toaster richColors />
            </>
          )}
        </QueryProvider>
      </body>
    </html>
  )
} 