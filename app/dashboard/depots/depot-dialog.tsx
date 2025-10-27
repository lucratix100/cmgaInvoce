'use client'

import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useEffect, useState } from "react"
import { createDepot, updateDepot } from "@/actions/depot"
import { useToast } from "@/components/ui/use-toast"

import { depot } from "@/types/index"

interface DepotDialogProps {
  onClose: () => void
  onSuccess: () => void
  depot?: depot | null
}

const initialState = {
  name: "",
  isActive: true,
  needDoubleCheck: false
}

export default function DepotDialog({ onClose, onSuccess, depot }: DepotDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState(initialState)
  const { toast } = useToast()
  const isEditing = !!depot

  useEffect(() => {
    if (depot) {
      setFormData({
        name: depot.name,
        isActive: depot.isActive,
        needDoubleCheck: depot.needDoubleCheck
      })
    } else {
      setFormData(initialState)
    }
  }, [depot])

  const resetForm = () => {
    setFormData(initialState)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = isEditing 
        ? await updateDepot(depot.id, {
          name: formData.name,
          isActive: formData.isActive,
          needDoubleCheck: formData.needDoubleCheck
        })
        : await createDepot({
          name: formData.name,
          isActive: formData.isActive,
          needDoubleCheck: formData.needDoubleCheck
        })

      if (result.success) {
        toast({
          title: "Succès",
          description: `Le dépôt a été ${isEditing ? 'modifié' : 'créé'} avec succès`,
        })
        resetForm()
        onSuccess()
        onClose()
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error || `Impossible de ${isEditing ? 'modifier' : 'créer'} le dépôt`,
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
            {isEditing ? "Modifier le dépôt" : "Ajouter un nouveau dépôt"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Modifiez les informations du dépôt."
              : "Remplissez les informations pour créer un nouveau dépôt."
            }
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nom du dépôt</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Dépôt Dakar"
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="need_double_check">Type de vérification :</Label>
            <div className="flex items-center space-x-4 gap-2">
              <Checkbox
                id="need_double_check"
                checked={formData.needDoubleCheck}
                onCheckedChange={(checked: boolean) => setFormData({ ...formData, needDoubleCheck: checked })}
                disabled={loading}
              /> 
              Double vérification
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="is_active">État :</Label>
            <div className="flex items-center space-x-4 gap-2">
              <Checkbox
                id="is_active"
                checked={formData.isActive}
                onCheckedChange={(checked: boolean) => setFormData({ ...formData, isActive: checked })}
                disabled={loading}
              /> 
              Actif
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (isEditing ? "Modification..." : "Création...") : (isEditing ? "Modifier" : "Créer")}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
    