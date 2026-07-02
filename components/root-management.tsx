"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { createCommercialInitial, deleteCommercialInitial } from "@/actions/commercial-initials-actions"
import { Role } from "@/types/roles"

const ROOT_VISIBILITY_OPTIONS = [
  { role: Role.COMMERCIAL_ADMIN, label: "Admin commercial" },
  { role: Role.ADMIN_DETAILLANT, label: "Admin détaillant" },
]

interface Root {
  id: string
  value: string
  suffixes: {
    id: string
    value: string
  }[]
  visibleToRoles: Role[]
  expanded: boolean
}

interface RootManagementProps {
  roots: Root[]
  setRoots: React.Dispatch<React.SetStateAction<Root[]>>
  onCreateRoot: (name: string, visibleToRoles: Role[]) => Promise<void>
  onUpdateRoot: (id: string, name: string, visibleToRoles?: Role[]) => Promise<void>
  onDeleteRoot: (id: string) => Promise<void>
}

export function RootManagement({
  roots,
  setRoots,
  onCreateRoot,
  onUpdateRoot,
  onDeleteRoot
}: RootManagementProps) {
  // Vérification de sécurité pour éviter l'erreur
  if (!roots || !Array.isArray(roots)) {
    return <div>Chargement des données...</div>
  }

  const [newRoot, setNewRoot] = useState("")
  const [newRootVisibleToRoles, setNewRootVisibleToRoles] = useState<Role[]>([])
  const [createRootOpen, setCreateRootOpen] = useState(false)
  const [newSuffix, setNewSuffix] = useState("")
  const [editingRoot, setEditingRoot] = useState<string | null>(null)
  const [editingRootValue, setEditingRootValue] = useState("")
  const [editingRootVisibleToRoles, setEditingRootVisibleToRoles] = useState<Role[]>([])
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAddRoot = async () => {
    if (!newRoot.trim()) {
      setError("La racine ne peut pas être vide")
      return
    }
    if (roots.some((root) => root.value.toLowerCase() === newRoot.trim().toLowerCase())) {
      setError("Cette racine existe déjà")
      return
    }
    if (newRootVisibleToRoles.length === 0) {
      setError("Sélectionnez au moins un rôle autorisé")
      return
    }

    try {
      await onCreateRoot(newRoot.trim(), newRootVisibleToRoles)
      setNewRoot("")
      setNewRootVisibleToRoles([])
      setCreateRootOpen(false)
      setError(null)
      toast.success("Racine créée avec succès")
    } catch (error) {
      console.error("Erreur lors de l'ajout de la racine:", error)
    }
  }

  const handleUpdateRoot = async (id: string, newValue: string, visibleToRoles?: Role[]) => {
    try {
      await onUpdateRoot(id, newValue, visibleToRoles)
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la racine:", error)
    }
  }

  const handleDeleteRoot = async (id: string) => {
    try {
      await onDeleteRoot(id)
    } catch (error) {
      toast.error('Erreur lors de la suppression de la racine')
      console.error("Erreur lors de la suppression de la racine:", error)
    }
  }

  const handleEditRoot = (id: string) => {
    const root = roots.find((r) => r.id === id)
    if (root) {
      setEditingRoot(id)
      setEditingRootValue(root.value)
      setEditingRootVisibleToRoles(root.visibleToRoles || [Role.COMMERCIAL_ADMIN])
      setError(null)
    }
  }

  const handleSaveRoot = async (id: string) => {
    if (!editingRootValue.trim()) {
      setError("La racine ne peut pas être vide")
      return
    }
    if (roots.some((root) => root.id !== id && root.value.toLowerCase() === editingRootValue.toLowerCase())) {
      setError("Cette racine existe déjà")
      return
    }
    if (editingRootVisibleToRoles.length === 0) {
      setError("Sélectionnez au moins un rôle autorisé")
      return
    }
    try {
      await handleUpdateRoot(id, editingRootValue, editingRootVisibleToRoles)
      setRoots(
        roots.map((root) =>
          root.id === id
            ? {
              ...root,
              value: editingRootValue,
              visibleToRoles: editingRootVisibleToRoles,
            }
            : root,
        ),
      )
      setEditingRoot(null)
      setEditingRootVisibleToRoles([])
      setError(null)
      toast.success('Racine mise à jour avec succès')
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la racine:", error)
      toast.error('Erreur lors de la mise à jour de la racine')
    }
  }

  const handleToggleExpand = (id: string) => {
    setRoots(
      roots.map((root) =>
        root.id === id
          ? {
            ...root,
            expanded: !root.expanded,
          }
          : root,
      ),
    )
  }

  const handleAddSuffix = async (rootId: string) => {
    if (!newSuffix.trim()) {
      setError("Le suffixe ne peut pas être vide")
      return
    }
    const root = roots.find((r) => r.id === rootId)
    if (!root) {
      setError("Racine non trouvée")
      return
    }
    if (root.suffixes.some((suffix) => suffix.value.toLowerCase() === newSuffix.toLowerCase())) {
      setError("Ce suffixe existe déjà pour cette racine")
      return
    }

    try {
      const newCommercialInitial = await createCommercialInitial(
        newSuffix.trim(),
        parseInt(rootId)
      )

      setRoots(
        roots.map((root) =>
          root.id === rootId
            ? {
              ...root,
              suffixes: [
                ...root.suffixes,
                {
                  id: newCommercialInitial.id.toString(),
                  value: newCommercialInitial.name,
                },
              ],
            }
            : root,
        ),
      )
      setNewSuffix("")
      setError(null)
      toast.success('Suffixe créé avec succès')
    } catch (error) {
      console.error("Erreur lors de l'ajout du suffixe:", error)
      toast.error('Erreur lors de la création du suffixe')
    }
  }

  const handleDeleteSuffix = async (rootId: string, suffixId: string) => {
    try {
      await deleteCommercialInitial(parseInt(suffixId))

      setRoots(
        roots.map((root) =>
          root.id === rootId
            ? {
              ...root,
              suffixes: root.suffixes.filter((suffix) => suffix.id !== suffixId),
            }
            : root,
        ),
      )
      toast.success('Suffixe supprimé avec succès')
    } catch (error) {
      console.error("Erreur lors de la suppression du suffixe:", error)
      toast.error('Erreur lors de la suppression du suffixe')
    }
  }
  const handleSelectRoot = (rootId: string) => {
    setSelectedRoot(rootId === selectedRoot ? null : rootId)
    setNewSuffix("")
  }

  const closeCreateRootDialog = (open: boolean) => {
    setCreateRootOpen(open)
    if (!open) {
      setNewRoot("")
      setNewRootVisibleToRoles([])
      setError(null)
    }
  }

  const closeEditRootDialog = (open: boolean) => {
    if (!open) {
      setEditingRoot(null)
      setEditingRootValue("")
      setEditingRootVisibleToRoles([])
      setError(null)
    }
  }

  const toggleRole = (role: Role, roles: Role[], onChange: (roles: Role[]) => void) => {
    onChange(
      roles.includes(role)
        ? roles.filter((item) => item !== role)
        : [...roles, role]
    )
  }

  const renderRolePicker = (roles: Role[], onChange: (roles: Role[]) => void) => (
    <div className="grid gap-2 rounded-lg border bg-gray-50 p-3">
      <p className="text-sm font-medium">Visible par</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {ROOT_VISIBILITY_OPTIONS.map((option) => (
          <label
            key={option.role}
            className="flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm transition hover:border-primary/50"
          >
            <Checkbox
              checked={roles.includes(option.role)}
              onCheckedChange={() => toggleRole(option.role, roles, onChange)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  )

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card className="h-fit">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Racines</CardTitle>
            <CardDescription>Créez et gérez les racines des numéros de facture</CardDescription>
          </div>
          <Button onClick={() => setCreateRootOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle racine
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {roots.map((root) => (
                <div key={root.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-6 w-6"
                        onClick={() => handleToggleExpand(root.id)}
                      >
                        {root.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <span className="font-medium">{root.value}</span>
                      <Badge variant="outline" className="ml-2">
                        {root.suffixes.length} suffixe{root.suffixes.length !== 1 ? "s" : ""}
                      </Badge>
                      <div className="flex flex-wrap gap-1">
                        {(root.visibleToRoles || []).map((role) => (
                          <Badge key={role} variant="secondary" className="text-[10px]">
                            {role === Role.COMMERCIAL_ADMIN ? "Admin commercial" : "Admin détaillant"}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex space-x-1">
                      <Button onClick={() => handleEditRoot(root.id)} size="icon" variant="ghost" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteRoot(root.id)}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleSelectRoot(root.id)}
                        size="sm"
                        variant={selectedRoot === root.id ? "default" : "outline"}
                        className="h-8"
                      >
                        Gérer les suffixes
                      </Button>
                    </div>
                  </div>

                  {root.expanded && root.suffixes.length > 0 && (
                    <div className="mt-3 pl-6">
                      <Separator className="mb-2" />
                      <div className="flex flex-wrap gap-2">
                        {root.suffixes.map((suffix) => (
                          <div key={suffix.id} className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-sm">
                              {suffix.value}
                            </Badge>
                            <Button
                              onClick={() => handleDeleteSuffix(root.id, suffix.id)}
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {roots.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune racine créée. Ajoutez votre première racine.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <Dialog open={createRootOpen} onOpenChange={closeCreateRootDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une racine</DialogTitle>
              <DialogDescription>
                Renseignez la racine puis choisissez les profils administrateurs qui pourront la voir et la gérer.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Racine</label>
                <Input
                  placeholder="Ex: ASF"
                  value={newRoot}
                  onChange={(event) => setNewRoot(event.target.value)}
                />
              </div>
              {renderRolePicker(newRootVisibleToRoles, setNewRootVisibleToRoles)}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => closeCreateRootDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddRoot}>
                Créer la racine
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editingRoot !== null} onOpenChange={closeEditRootDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier la racine</DialogTitle>
              <DialogDescription>
                Modifiez le nom de la racine et les profils qui peuvent la voir.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Racine</label>
                <Input
                  value={editingRootValue}
                  onChange={(event) => setEditingRootValue(event.target.value)}
                />
              </div>
              {renderRolePicker(editingRootVisibleToRoles, setEditingRootVisibleToRoles)}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => closeEditRootDialog(false)}>
                Annuler
              </Button>
              <Button onClick={() => editingRoot && handleSaveRoot(editingRoot)}>
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suffixes</CardTitle>
          <CardDescription>
            {selectedRoot
              ? `Gérez les suffixes pour la racine ${roots.find((r) => r.id === selectedRoot)?.value || ""}`
              : "Sélectionnez une racine pour gérer ses suffixes"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedRoot ? (
            <>
              <div className="flex space-x-2 mb-6">
                <Input
                  placeholder="Nouveau suffixe"
                  value={newSuffix}
                  onChange={(e) => setNewSuffix(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={() => handleAddSuffix(selectedRoot)} className="h-10 w-10">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {roots
                    .find((r) => r.id === selectedRoot)
                    ?.suffixes.map((suffix) => (
                      <div key={suffix.id} className="flex items-center justify-between border rounded-lg p-3">
                        <div className="flex items-center">
                          <span className="font-medium">{suffix.value}</span>
                        </div>
                        <Button
                          onClick={() => handleDeleteSuffix(selectedRoot, suffix.id)}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  {roots.find((r) => r.id === selectedRoot)?.suffixes.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucun suffixe créé pour cette racine. Ajoutez votre premier suffixe.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-center">
              <div className="text-muted-foreground mb-4">Veuillez sélectionner une racine pour gérer ses suffixes</div>
              <div className="flex flex-wrap gap-2 justify-center">
                {roots.map((root) => (
                  <Button key={root.id} variant="outline" onClick={() => handleSelectRoot(root.id)} className="mb-2">
                    {root.value}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedRoot
              ? `${roots.find((r) => r.id === selectedRoot)?.suffixes.length || 0} suffixe(s) pour cette racine`
              : ""}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
