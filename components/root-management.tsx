"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { createCommercialInitial, deleteCommercialInitial } from "@/actions/commercial-initials-actions"

interface Root {
  id: string
  value: string
  suffixes: {
    id: string
    value: string
  }[]
  expanded: boolean
}

interface RootManagementProps {
  roots: Root[]
  setRoots: React.Dispatch<React.SetStateAction<Root[]>>
  onCreateRoot: (name: string) => Promise<void>
  onUpdateRoot: (id: string, name: string) => Promise<void>
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
  const [newSuffix, setNewSuffix] = useState("")
  const [editingRoot, setEditingRoot] = useState<string | null>(null)
  const [editingRootValue, setEditingRootValue] = useState("")
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAddRoot = async () => {
    if (!newRoot.trim()) return

    try {
      await onCreateRoot(newRoot.trim())
      setNewRoot("")
    } catch (error) {
      console.error("Erreur lors de l'ajout de la racine:", error)
    }
  }

  const handleUpdateRoot = async (id: string, newValue: string) => {
    try {
      await onUpdateRoot(id, newValue)
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la racine:", error)
    }
  }

  const handleDeleteRoot = async (id: string) => {
    try {
      await onDeleteRoot(id)
    } catch (error) {
      console.error("Erreur lors de la suppression de la racine:", error)
    }
  }

  const handleEditRoot = (id: string) => {
    const root = roots.find((r) => r.id === id)
    if (root) {
      setEditingRoot(id)
      setEditingRootValue(root.value)
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
    try {
      await handleUpdateRoot(id, editingRootValue)
      setRoots(
        roots.map((root) =>
          root.id === id
            ? {
              ...root,
              value: editingRootValue,
            }
            : root,
        ),
      )
      setEditingRoot(null)
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
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Racines</CardTitle>
          <CardDescription>Créez et gérez les racines des numéros de facture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-6">
            <Input
              placeholder="Nouvelle racine"
              value={newRoot}
              onChange={(e) => setNewRoot(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddRoot} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

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
                    {editingRoot === root.id ? (
                      <div className="flex-1 flex space-x-2">
                        <Input
                          value={editingRootValue}
                          onChange={(e) => setEditingRootValue(e.target.value)}
                          className="flex-1"
                        />
                        <Button onClick={() => handleSaveRoot(root.id)} size="icon" variant="outline">
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
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
                      </div>
                    )}

                    <div className="flex space-x-1">
                      {editingRoot !== root.id && (
                        <Button onClick={() => handleEditRoot(root.id)} size="icon" variant="ghost" className="h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
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
                          <Badge key={suffix.id} variant="secondary" className="text-sm">
                            {suffix.value}
                          </Badge>
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
                <Button onClick={() => handleAddSuffix(selectedRoot)} size="icon">
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
