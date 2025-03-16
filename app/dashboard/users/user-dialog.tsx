'use client'

import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { createUser, updateUser } from "@/actions/user"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { getDepots } from "@/actions/depot"
import { Role } from "@/types/roles"
import { cn } from "@/lib/utils"

interface UserDialogProps {
  onClose: () => void
  onSuccess: () => void
  user?: {
    id: number
    firstname: string
    lastname: string
    email: string
    phone: string
    role: string
    depotId: number
    isActive: boolean
  } | null
}

interface FormErrors {
  firstname?: string[]
  lastname?: string[]
  email?: string[]
  phone?: string[]
  role?: string[]
  depotId?: string[]
  isActive?: string[]
}

const initialState = {
  firstname: "",
  lastname: "",
  email: "",
  phone: "",
  password: "",
  role: "",
  depotId: 0,
  isActive: true
}

const roles = [
  { value: Role.ADMIN, label: 'Administrateur' },
  { value: Role.MAGASINIER, label: 'Magasinier' },
  { value: Role.CHEF_DEPOT, label: 'Chef de dépôt' },
  { value: Role.RECOUVREMENT, label: 'Recouvrement' },
  { value: Role.CONTROLEUR, label: 'Contrôleur' }
]

export default function UserDialog({ onClose, onSuccess, user }: UserDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState(initialState)
  const [depots, setDepots] = useState([])
  const { toast } = useToast()
  const isEditing = !!user
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    const loadDepots = async () => {
      try {
        const data = await getDepots()
        setDepots(data)
      } catch (error) {
        console.error("Erreur chargement dépôts:", error)
      }
    }
    loadDepots()
  }, [])

  useEffect(() => {
    if (user) {
      setFormData({
        firstname: user.firstname || "",
        lastname: user.lastname || "",
        email: user.email || "",
        phone: user.phone || "",
        password: "",
        role: user.role || "",
        depotId: user.depotId || 0,
        isActive: user.isActive ?? true
      })
    } else {
      setFormData(initialState)
    }
  }, [user])

  const handleClose = () => {
    setFormData(initialState)
    onClose()
  }

  const handleSuccess = () => {
    setFormData(initialState)
    onSuccess()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const apiData = {
        firstname: formData.firstname,
        lastname: formData.lastname,
        email: formData.email,
        phone: formData.phone,
        password: "P@sser123",
        role: formData.role as Role,
        depotId: formData.depotId,
        isActive: formData.isActive
      }
      
      console.log('Données envoyées:', apiData)
      
      const result = isEditing 
        ? await updateUser(user.id, apiData)
        : await createUser(apiData)

      if (result.success) {
        toast({
          title: "Succès",
          description: `L'utilisateur a été ${isEditing ? 'modifié' : 'créé'} avec succès`,
        })
        handleSuccess()
      } else {
        if (result.error) {
          if (typeof result.error === 'object' && !Array.isArray(result.error)) {
            setErrors(result.error as FormErrors)
          } else {
            toast({
              variant: "destructive",
              title: "Erreur",
              description: Array.isArray(result.error) 
                ? result.error[0] 
                : (typeof result.error === 'string' 
                  ? result.error 
                  : "Une erreur est survenue")
            })
          }
        }
      }
    } catch (error: any) {
      console.error("Erreur inattendue:", error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur inattendue est survenue"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier l'utilisateur" : "Ajouter un nouvel utilisateur"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Modifiez les informations de l'utilisateur."
              : "Remplissez les informations pour créer un nouvel utilisateur."
            }
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="firstname">Prénom</Label>
            <Input
              id="firstname"
              value={formData.firstname}
              onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
              className={cn(errors.firstname && "border-red-500")}
              disabled={loading}
            />
            {errors.firstname && (
              <p className="text-sm text-red-500">{errors.firstname.join(', ')}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lastname">Nom</Label>
            <Input
              id="lastname"
              value={formData.lastname}
              onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
              className={cn(errors.lastname && "border-red-500")}
              disabled={loading}
            />
            {errors.lastname && (
              <p className="text-sm text-red-500">{errors.lastname.join(', ')}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={cn(errors.email && "border-red-500")}
              disabled={loading}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.join(', ')}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={cn(errors.phone && "border-red-500")}
              disabled={loading}
            />
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone.join(', ')}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Rôle</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
              disabled={loading}
            >
              <SelectTrigger className={cn(errors.role && "border-red-500")}>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-500">{errors.role.join(', ')}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="depot">Dépôt</Label>
            <Select
              value={formData.depotId.toString()}
              onValueChange={(value) => setFormData({ ...formData, depotId: parseInt(value) })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un dépôt" />
              </SelectTrigger>
              <SelectContent>
                {depots.map((depot: any) => (
                  <SelectItem key={depot.id} value={depot.id.toString()}>
                    {depot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked: boolean) => setFormData({ ...formData, isActive: checked })}
              disabled={loading}
            />
            <Label htmlFor="isActive">Actif</Label>
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