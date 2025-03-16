'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Truck } from "lucide-react"
import { useEffect, useState } from "react"
import { deleteDriver, getDrivers } from "@/actions/driver"
import { useToast } from "@/components/ui/use-toast"
import { ConfirmDialog } from "@/components/alert-dialog"

interface Driver {
  id: number
  firstname: string
  lastname: string
  phone: string
  isActive: boolean
}

interface DriverTableProps {
  onEdit: (driver: Driver) => void
}

export default function DriverTable({ onEdit }: DriverTableProps) {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null)
  const { toast } = useToast()

  const fetchDrivers = async () => {
    if (loading) return

    try {
      setLoading(true)
      const data = await getDrivers()
      setDrivers(data)
    } catch (err) {
      console.error("Erreur de chargement des conducteurs:", err)
      setError("Impossible de charger les conducteurs. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDrivers()
  }, [])

  const handleDeleteClick = (driver: Driver) => {
    setDriverToDelete(driver)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!driverToDelete) return

    try {
      const result = await deleteDriver(driverToDelete.id)
      if (result) {
        toast({
          title: "Succès",
          description: "Le conducteur a été supprimé avec succès",
        })
        setDrivers(drivers.filter(d => d.id !== driverToDelete.id))
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de supprimer le conducteur",
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
      setDriverToDelete(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="bg-primary-50 pb-3">
          <CardTitle className="flex items-center gap-2 text-primary-700">
            <Truck className="h-5 w-5" />
            Liste des conducteurs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement des conducteurs...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : drivers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Aucun conducteur trouvé</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-primary-50/50">
                  <TableHead className="font-semibold">Prénom</TableHead>
                  <TableHead className="font-semibold">Nom</TableHead>
                  <TableHead className="font-semibold">Téléphone</TableHead>
                  <TableHead className="font-semibold">Statut</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow key={driver.id} className="hover:bg-primary-50/30 transition-colors">
                    <TableCell className="font-medium">{driver.firstname}</TableCell>
                    <TableCell>{driver.lastname}</TableCell>
                    <TableCell>{driver.phone}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={driver.isActive ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-200" : "bg-red-100 text-red-700 hover:bg-red-200 border-red-200"}
                      >
                        {driver.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(driver)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteClick(driver)}
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
        title="Supprimer le conducteur"
        description="Cette action est irréversible. Cela supprimera définitivement le conducteur"
        onConfirm={handleDeleteConfirm}
        itemName={`${driverToDelete?.firstname} ${driverToDelete?.lastname}`}
      />
    </>
  )
}
