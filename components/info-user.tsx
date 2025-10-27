'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { User, Mail, Phone } from "lucide-react"

interface InfoUserProps {
  user: any
}

export default function InfoUser({ user }: InfoUserProps) {
  // Utiliser directement les données passées en props
  const fullName = user?.firstname && user?.lastname 
    ? `${user.firstname} ${user.lastname}`
    : ''

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations personnelles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">
              <User className="h-4 w-4 inline mr-2" />
              Nom complet
            </Label>
            <Input 
              id="name" 
              value={fullName}
              readOnly 
              className="bg-muted cursor-default" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">
              <Mail className="h-4 w-4 inline mr-2" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={user?.email || 'Non renseigné'}
              readOnly
              className="bg-muted cursor-default"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">
              <Phone className="h-4 w-4 inline mr-2" />
              Téléphone
            </Label>
            <Input
              id="phone"
              type="tel"
              value={user?.phone || ''}
              readOnly
              className="bg-muted cursor-default"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
