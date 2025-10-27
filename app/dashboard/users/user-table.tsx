'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card" 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Eye, Trash2, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { deleteUser, getUsers } from "@/actions/user"
import { useToast } from "@/components/ui/use-toast"
import { ConfirmDialog } from "@/components/alert-dialog"

interface User {
  id: number
  firstname: string
  lastname: string
  email: string
  phone: string
  role: string
  depot_id: number
  depot: {
    id: number
    name: string
  }
  isActive: boolean
}

interface UserTableProps {
  onEdit: (user: User) => void
}

export default function UserTable({ onEdit }: UserTableProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const { toast } = useToast()

  const fetchUsers = async () => {
    if (loading) return

    try {
      setLoading(true)
      const data = await getUsers()
      setUsers(data)
    } catch (err) {
      console.error("Erreur de chargement des utilisateurs:", err)
      setError("Impossible de charger les utilisateurs. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return

    try {
      const result = await deleteUser(userToDelete.id)
      if (result.success) {
        toast({
          title: "Succès",
          description: "L'utilisateur a été supprimé avec succès",
        })
        setUsers(users.filter(u => u.id !== userToDelete.id))
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de supprimer l'utilisateur",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression",
      })
    } finally {
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="bg-primary-50 pb-3">
          <CardTitle className="flex items-center gap-2 text-primary-700">
            <Users className="h-5 w-5" />
            Liste des utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement des utilisateurs...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Aucun utilisateur trouvé</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-primary-50/50">
                  <TableHead className="font-semibold">Prénom</TableHead>
                  <TableHead className="font-semibold">Nom</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Téléphone</TableHead>
                  <TableHead className="font-semibold">Rôle</TableHead>
                  <TableHead className="font-semibold">Dépôt</TableHead>
                  <TableHead className="font-semibold">Statut</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-primary-50/30 transition-colors">
                    <TableCell className="font-medium">{user.firstname}</TableCell>
                    <TableCell>{user.lastname}</TableCell>
                    <TableCell>{user.email || <span className="text-muted-foreground">Non assigné</span>}</TableCell>
                    <TableCell>{user.phone || <span className="text-muted-foreground">Non assigné</span>}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-primary-50 text-primary-700 border-primary-200">
                        {getRoleName(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.depot ? (
                        <Badge variant="outline" className="bg-primary-50 text-primary-700 border-primary-200">
                          {user.depot.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Non assigné</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          user.isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200 border-red-200"
                        }
                      >
                        {user.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteClick(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer l'utilisateur"
        description="Cette action est irréversible. Cela supprimera définitivement l'utilisateur"
        onConfirm={handleDeleteConfirm}
        itemName={userToDelete ? `${userToDelete.firstname} ${userToDelete.lastname}` : ''}
      />
    </>
  )
}

function getRoleName(role: string): string {
  const roleMap: { [key: string]: string } = {
    'ADMIN': 'Administrateur',
    'MAGASINIER': 'Magasinier',
    'CHEF DEPOT': 'Chef de dépôt',
    'RECOUVREMENT': 'Recouvrement',
    'CONTROLEUR': 'Contrôleur',
    'SUPERVISEUR_MAGASIN': 'Superviseur Magasin'
  }
  return roleMap[role] || role
}