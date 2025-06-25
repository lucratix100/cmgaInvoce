import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from "@/components/ui/toaster"
import { getCurrentUser } from '@/actions/user'
import Header from '@/components/navbar/navbar'
import SideBar from '@/components/side-bar'
import { Role } from '@/types/roles'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'CMGA Delivery',
  description: 'Suivi livraisons CMGA',
  generator: 'CMGA Delivery',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <html lang="fr">
      <body>
        <div className="flex min-h-screen">
          {/* Sidebar */}
          {user && user.role === Role.ADMIN && <SideBar />}
          {/* Main content */}
          <div className="flex-1">
            {/* Header */}
            {user && <header className="border-b bg-white shadow-sm sticky top-0 z-40">
              <Header user={user} />
            </header>}
            <main className="p-4 md:p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  )
} 