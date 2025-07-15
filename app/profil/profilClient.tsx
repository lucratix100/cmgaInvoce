"use client"

import { useEffect, useState } from "react"
import { getCurrentUser } from "@/actions/user"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ChangePassword from "@/components/changePassword/change-password"
import InfoUser from "@/components/info-user"

export default function ProfilClient() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await getCurrentUser()
        setUser(data)
      } catch (error) {
        console.error("Erreur lors du chargement de l'utilisateur:", error)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  if (loading) {
    return <div>Chargement...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      <div className="px-4 md:px-6 py-6">
        {user?.role === "ADMIN" ? (
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-primary hover:text-primary-600 transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" />
            Retour au dashboard
          </Link>
        ) : (
          <Link href="/factures" className="inline-flex items-center gap-2 text-primary hover:text-primary-600 transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" />
            Retour aux factures
          </Link>
        )}
        
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Avatar className="h-20 w-20 border-2 border-primary/10">
              <AvatarFallback className="bg-primary text-white text-xl">
                {user?.firstname?.[0].toUpperCase()}{user?.lastname?.[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-primary-700">
                {user?.firstname} {user?.lastname}
              </h1>
              <p className="text-primary-600/70">{user?.role}</p>
            </div>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="bg-white border-b border-primary-100">
              <TabsTrigger 
                value="profile"
                className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700 data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                Profil
              </TabsTrigger>
              <TabsTrigger 
                value="security"
                className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700 data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                Sécurité
              </TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="space-y-6">
              <InfoUser user={user} />
            </TabsContent>
            <TabsContent value="security" className="space-y-6">
              <ChangePassword user={user} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
} 