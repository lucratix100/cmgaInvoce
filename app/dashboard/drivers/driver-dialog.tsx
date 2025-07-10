'use client'

import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { createDriver, updateDriver } from "@/actions/driver"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectItem } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface DriverDialogProps {
  onClose: () => void
  onSuccess: () => void
  driver?: {
    id: number
    firstname: string
    lastname: string
    phone: string
    isActive: boolean
  } | null
}

const initialState = {
  firstname: "",
  lastname: "",
  phone: "",
  isActive: true
}

export default function DriverDialog({ onClose, onSuccess, driver }: DriverDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState(initialState)
  const { toast } = useToast()
  const isEditing = !!driver

  useEffect(() => {
    if (driver) {
      setFormData({
        firstname: driver.firstname,
        lastname: driver.lastname,
        phone: driver.phone,
        isActive: driver.isActive
      })
    } else {
      setFormData(initialState)
    }
  }, [driver])

  const resetForm = () => {
    setFormData(initialState)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = isEditing 
        ? await updateDriver(driver.id, {
          ...formData,
          isActive: formData.isActive
        })
        : await createDriver({
          ...formData,
          isActive: formData.isActive
        })

      if (result.success) {
        toast({
          title: "Succès",
          description: `Le conducteur a été ${isEditing ? 'modifié' : 'créé'} avec succès`,
        })
        resetForm()
        onSuccess()
        onClose()
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error || `Impossible de ${isEditing ? 'modifier' : 'créer'} le conducteur`,
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <DialogContent className="bg-white">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le conducteur" : "Ajouter un nouveau conducteur"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Modifiez les informations du conducteur."
              : "Remplissez les informations pour créer un nouveau conducteur."
            }
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="firstname">Prénom :</Label>
            <Input
              id="firstname"
              value={formData.firstname}
              onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
              placeholder="Ex: Ibrahima"
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lastname">Nom :</Label>
            <Input
              id="lastname"
              value={formData.lastname}
              onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
              placeholder="Ex: Diallo"
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Téléphone :</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Ex: 77 123 45 67"
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="isActive">Etat :</Label>
            <div className="flex items-center space-x-4 gap-2">
            <Checkbox
              id="isActive"
              defaultChecked={true}
              checked={formData.isActive}
              onCheckedChange={(checked: boolean) => setFormData({ ...formData, isActive: checked })}
            /> Actif
           </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="destructive" type="button" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button variant="default" type="submit" disabled={loading}>
            {loading ? (isEditing ? "Modification..." : "Création...") : (isEditing ? "Modifier" : "Ajouter")}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
