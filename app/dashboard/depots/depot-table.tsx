'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"
import { Building } from "lucide-react"
import { useEffect, useState } from "react"
import { deleteDepot, getDepots } from "@/actions/depot"
import { useToast } from "@/components/ui/use-toast"
import { ConfirmDialog } from "@/components/alert-dialog"
import { depot } from "@/types/index"

interface DepotTableProps {
  onEdit: (depot: depot) => void
}

export default function DepotTable({ onEdit }: DepotTableProps) {
  
  const [depots, setDepots] = useState<depot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [depotToDelete, setDepotToDelete] = useState<depot | null>(null)
  const { toast } = useToast()

  const fetchDepots = async () => {
    if (loading) return
    
    try {
      setLoading(true)
      const data = await getDepots()
      setDepots(data)
    } catch (err) {
      console.error("Erreur de chargement des dépôts:", err)
      setError("Impossible de charger les dépôts. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDepots()
  }, [])

  const handleDeleteClick = (depot: depot) => {
    setDepotToDelete(depot)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!depotToDelete) return
    try {
      const result = await deleteDepot(depotToDelete.id)
      if (result.success) {
        toast({
          title: "Succès",
          description: "Le dépôt a été supprimé avec succès",
        })
        setDepots(depots.filter(d => d.id !== depotToDelete.id))
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de supprimer le dépôt",
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
      setDepotToDelete(null)
    }
  }

 
  
  return (
    <>
      <Card>
        <CardHeader className="bg-primary-50 pb-3">
          <CardTitle className="flex items-center gap-2 text-primary-700">
            <Building className="h-5 w-5" />
            Liste des dépôts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement des dépôts...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : depots.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Aucun dépôt trouvé</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-primary-50/50">
                  <TableHead className="font-semibold">Nom</TableHead>
                  <TableHead className="font-semibold">Type vérification</TableHead>
                  <TableHead className="font-semibold">Statut</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depots.map((depot) => (
                  <TableRow key={depot.id} className="hover:bg-primary-50/30 transition-colors">
                    <TableCell className="font-medium">{depot.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          depot.needDoubleCheck
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
                        }
                      >
                        {depot.needDoubleCheck ? "Double vérification" : "Vérification simple"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          depot.isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200 border-red-200"
                        }
                      >
                        {depot.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(depot)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteClick(depot)}
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
        title="Supprimer le dépôt"
        description="Cette action est irréversible. Cela supprimera définitivement le dépôt"
        onConfirm={handleDeleteConfirm}
        itemName={depotToDelete?.name}
      />
    </>
  )
}