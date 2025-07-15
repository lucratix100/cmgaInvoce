'use client'


import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog"
import UserDialog from "./user-dialog"
import UserTable from "./user-table"

interface User {
  id: number
  firstname: string
  lastname: string
  email: string
  phone: string
  role: string
  depot_id: number
  depot?: {
    id: number
    name: string
  }
  isActive: boolean
}

export default function UtilisateursPage() {
  const [open, setOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [key, setKey] = useState(0)

  const handleEdit = (user: User) => {
    const userToEdit = {
      ...user,
      depot_id: user.depot?.id || 0
    }
    setSelectedUser(userToEdit)
    setOpen(true)
  }

  const handleClose = () => {
    setSelectedUser(null)
    setOpen(false)
  }

  const handleSuccess = () => {
    setKey(prevKey => prevKey + 1)
    setOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Rechercher un utilisateur..." className="pl-8" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-primary hover:bg-primary-600"
                onClick={() => setOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un utilisateur
              </Button>
            </DialogTrigger>
            <UserDialog
              onClose={handleClose}
              onSuccess={handleSuccess}
              user={selectedUser}
            />
          </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <UserTable key={key} onEdit={handleEdit} />
      </Card>
    </div>
  )
} 