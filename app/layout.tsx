import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from "@/components/ui/sonner"
import { getCurrentUser } from '@/actions/user'
import Header from '@/components/navbar/navbar'
import SideBar from '@/components/side-bar'
import { Role } from '@/types/roles'
import { getSession } from '@/lib/auth'
import QueryProvider from '@/components/providers/query-provider'
import DevServiceWorkerCleanup from '@/components/providers/dev-service-worker-cleanup'
import { ChatProvider } from '@/components/chat/chat-provider'
import ChatButton from '@/components/chat/chat-button'
import { getChatUsers } from '@/actions/chatUsers'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

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
  const session = await getSession()
  const token = session?.token

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

  // console.log(token, "token layout")

  // Les rôles commerciaux gèrent leur propre layout complet
  const isCommercialRole = user && (
    user.role === Role.AGENT_COMMERCIAL ||
    user.role === Role.COMMERCIAL_DETAILLANT ||
    user.role === Role.COMMERCIAL_ADMIN ||
    user.role === Role.ADMIN_DETAILLANT ||
    user.role === Role.FACTURATION
  )

  return (
    <html lang="fr">
      <body>
        <QueryProvider>
          <DevServiceWorkerCleanup />
          {token && user ? (
            <ChatProvider user={user} accessToken={token} users={users}>
              {isCommercialRole ? (
                // Layout simple pour les rôles commerciaux (gèrent leur propre navigation)
                <>
                  {children}
                  <ChatButton />
                  <Toaster richColors />
                </>
              ) : (
                // Layout standard pour les autres rôles
                <>
                  {user.role === Role.ADMIN ? (
                    <SidebarProvider>
                      <SideBar />
                      <SidebarInset>
                        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-white px-2 shadow-sm">
                          <SidebarTrigger />
                          <div className="min-w-0 flex-1">
                            <Header user={user} />
                          </div>
                        </header>
                        <main className="min-h-[calc(100vh-64px)] bg-gray-50 p-4 md:p-6">
                          {children}
                        </main>
                      </SidebarInset>
                    </SidebarProvider>
                  ) : (
                    <div className="flex min-h-screen">
                      <div className="flex-1">
                        <header className="sticky top-0 z-40 border-b bg-white shadow-sm">
                          <Header user={user} />
                        </header>
                        <main className="min-h-[calc(100vh-64px)] bg-gray-50 p-4 md:p-6">
                          {children}
                        </main>
                      </div>
                    </div>
                  )}
                  {/* Chat Button - visible seulement si l'utilisateur est connecté */}
                  <ChatButton />
                  <Toaster richColors />
                </>
              )}
            </ChatProvider>
          ) : (
            <>
              <main className="h-svh overflow-hidden bg-gray-50">
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