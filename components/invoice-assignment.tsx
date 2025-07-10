"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, ArrowRight, Search, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { getAssignments, createAssignment, deleteAssignment } from "@/actions/assignment-actions"
import { getRecouvrementUsers } from "@/actions/user"

// Types
type User = {
  id: number
  firstname: string
  lastname: string
  email: string
}

type Suffix = {
  id: string
  value: string
}

type Root = {
  id: string
  value: string
  suffixes: Suffix[]
  expanded?: boolean
}

type Assignment = {
  id: string
  type: "root" | "suffix"
  rootId: string
  suffixId?: string
  userId: string
  pattern: string
}

type InvoiceAssignmentProps = {
  roots: Root[]
}

export function InvoiceAssignment({ roots }: InvoiceAssignmentProps) {
  // Vérification de sécurité pour éviter l'erreur
  if (!roots || !Array.isArray(roots)) {
    return <div>Chargement des données...</div>
  }

  // État pour gérer la visibilité du bloc "Nouvelle Affectation"
  const [showNewAssignment, setShowNewAssignment] = useState(false)

  // État pour les utilisateurs
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  // Charger les utilisateurs
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getRecouvrementUsers()
        setUsers(data)
      } catch (error) {
        console.error("Erreur lors du chargement des utilisateurs:", error)
        toast.error("Erreur lors du chargement des utilisateurs")
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [])

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const data = await getAssignments()
        setAssignments(data.map(assignment => ({
          id: assignment.id.toString(),
          type: assignment.commercialInitialId ? "suffix" : "root",
          rootId: assignment.rootId.toString(),
          suffixId: assignment.commercialInitialId?.toString(),
          userId: assignment.userId?.toString() || "",
          pattern: assignment.pattern
        })))
      } catch (error) {
        console.error("Erreur lors du chargement des affectations:", error)
        toast.error("Erreur lors du chargement des affectations")
      } finally {
        setLoading(false)
      }
    }

    fetchAssignments()
  }, [])

  // State
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null)
  const [selectedSuffixIds, setSelectedSuffixIds] = useState<string[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [assignByRoot, setAssignByRoot] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtres pour la liste des affectations
  const [filterUserId, setFilterUserId] = useState<string | null>(null)
  const [filterRootId, setFilterRootId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Handlers
  const handleAddAssignment = async () => {
    if (!selectedRootId || !selectedUserId) {
      setError("Veuillez sélectionner une racine et un utilisateur")
      return
    }

    try {
      if (assignByRoot) {
        // Vérifier si la racine est déjà affectée
        const existingAssignment = assignments.find(
          (a) => a.type === "root" && a.rootId === selectedRootId
        )
        if (existingAssignment) {
          setError("Cette racine est déjà affectée à un utilisateur")
          return
        }

        // Vérifier si des suffixes sont déjà affectés
        const hasSuffixAssignments = assignments.some(
          (a) => a.type === "suffix" && a.rootId === selectedRootId
        )
        if (hasSuffixAssignments) {
          setError("Des suffixes de cette racine sont déjà affectés. Veuillez les supprimer d'abord.")
          return
        }

        const newAssignment = await createAssignment(
          parseInt(selectedRootId),
          null,
          parseInt(selectedUserId)
        )

        setAssignments([
          ...assignments,
          {
            id: newAssignment.id.toString(),
            type: "root",
            rootId: selectedRootId,
            userId: selectedUserId,
            pattern: newAssignment.pattern
          },
        ])
      } else {
        if (selectedSuffixIds.length === 0) {
          setError("Veuillez sélectionner au moins un suffixe")
          return
        }

        // Vérifier si la racine est déjà entièrement affectée
        const existingRootAssignment = assignments.find(
          (a) => a.type === "root" && a.rootId === selectedRootId
        )
        if (existingRootAssignment) {
          setError("Cette racine est déjà entièrement affectée à un utilisateur")
          return
        }

        // Créer les affectations pour chaque suffixe sélectionné
        for (const suffixId of selectedSuffixIds) {
          console.log("Création d'affectation pour le suffixe:", suffixId)
          console.log("RootId:", selectedRootId)
          console.log("UserId:", selectedUserId)

          const newAssignment = await createAssignment(
            parseInt(selectedRootId),
            parseInt(suffixId),
            parseInt(selectedUserId)
          )

          setAssignments(prev => [
            ...prev,
            {
              id: newAssignment.id.toString(),
              type: "suffix",
              rootId: selectedRootId,
              suffixId: suffixId,
              userId: selectedUserId,
              pattern: newAssignment.pattern
            },
          ])
        }
      }

      // Réinitialiser la sélection
      setSelectedSuffixIds([])
      setError(null)
      toast.success("Affectation créée avec succès")
    } catch (error) {
      console.error("Erreur lors de la création de l'affectation:", error)
      toast.error("Erreur lors de la création de l'affectation")
    }
  }

  const handleDeleteAssignment = async (id: string) => {
    try {
      await deleteAssignment(parseInt(id))
      setAssignments(assignments.filter((a) => a.id !== id))
      toast.success("Affectation supprimée avec succès")
    } catch (error) {
      console.error("Erreur lors de la suppression de l'affectation:", error)
      toast.error("Erreur lors de la suppression de l'affectation")
    }
  }

  const getAssignmentLabel = (assignment: Assignment) => {
    return assignment.pattern
  }

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id.toString() === userId)
    return user ? `${user.firstname} ${user.lastname}` : "Pas d'utilisateur affecté"
  }

  const getRootName = (rootId: string) => {
    const root = roots.find((r) => r.id === rootId)
    return root ? root.value : "Pas de racine affectée"
  }

  const handleRootChange = (rootId: string) => {
    setSelectedRootId(rootId)
    setSelectedSuffixIds([])
    setError(null)
  }

  const handleSuffixToggle = (suffixId: string) => {
    console.log("handleSuffixToggle", suffixId)
    console.log("Toggle du suffixe:", suffixId)
    setSelectedSuffixIds((prev) => {
      const newIds = prev.includes(suffixId)
        ? prev.filter((id) => id !== suffixId)
        : [...prev, suffixId]
      console.log("Nouveaux IDs sélectionnés:", newIds)
      return newIds
    })
  }

  const isSuffixAssigned = (rootId: string, suffixId: string) => {
    return assignments.some((a) => a.type === "suffix" && a.rootId === rootId && a.suffixId === suffixId)
  }

  const getAssignedUser = (rootId: string, suffixId: string) => {
    const assignment = assignments.find((a) => a.type === "suffix" && a.rootId === rootId && a.suffixId === suffixId)
    return assignment ? getUserName(assignment.userId) : null
  }

  const handleSelectAllSuffixes = () => {
    if (!selectedRootId) return

    const availableSuffixes =
      roots
        .find((r) => r.id === selectedRootId)
        ?.suffixes.filter((suffix) => !isSuffixAssigned(selectedRootId, suffix.id))
        .map((suffix) => suffix.id) || []

    setSelectedSuffixIds(availableSuffixes)
  }

  const handleDeselectAllSuffixes = () => {
    setSelectedSuffixIds([])
  }

  // Filtrer les affectations selon les critères
  const filteredAssignments = assignments.filter((assignment) => {
    // Filtre par utilisateur
    if (filterUserId && assignment.userId !== filterUserId) {
      return false
    }

    // Filtre par racine
    if (filterRootId && assignment.rootId !== filterRootId) {
      return false
    }

    // Filtre par recherche
    if (searchTerm) {
      const assignmentLabel = getAssignmentLabel(assignment).toLowerCase()
      const userName = getUserName(assignment.userId).toLowerCase()
      const rootName = getRootName(assignment.rootId).toLowerCase()

      return (
        assignmentLabel.includes(searchTerm.toLowerCase()) ||
        userName.includes(searchTerm.toLowerCase()) ||
        rootName.includes(searchTerm.toLowerCase())
      )
    }

    return true
  })

  // Réinitialiser tous les filtres
  const resetFilters = () => {
    setFilterUserId(null)
    setFilterRootId(null)
    setSearchTerm("")
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => setShowNewAssignment(!showNewAssignment)}
          variant="outline"
          className="flex items-center gap-2"
        >
          {showNewAssignment ? (
            <>
              <X className="h-4 w-4" />
              Masquer
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Nouvelle Affectation
            </>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {showNewAssignment && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Nouvelle Affectation</CardTitle>
                <CardDescription>Créez une nouvelle règle d'affectation de factures</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="assign-mode" checked={assignByRoot} onCheckedChange={setAssignByRoot} />
                      <Label htmlFor="assign-mode">{assignByRoot ? "Affecter par racine" : "Affecter par suffixe(s)"}</Label>
                    </div>

                    <div>
                      <Label htmlFor="root-select" className="block mb-2">
                        Sélectionner une racine
                      </Label>
                      <Select onValueChange={handleRootChange}>
                        <SelectTrigger id="root-select">
                          <SelectValue placeholder="Sélectionner une racine" />
                        </SelectTrigger>
                        <SelectContent>
                          {roots.map((root) => (
                            <SelectItem key={root.id} value={root.id}>
                              {root.value} ({root.suffixes.length} suffixe{root.suffixes.length !== 1 ? "s" : ""})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {!assignByRoot && selectedRootId && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Sélectionner des suffixes</Label>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={handleSelectAllSuffixes}>
                              Tout sélectionner
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleDeselectAllSuffixes}>
                              Tout désélectionner
                            </Button>
                          </div>
                        </div>

                        <Card className="border">
                          <ScrollArea className="h-[200px]">
                            <div className="p-4 space-y-2">
                              {roots
                                .find((r) => r.id === selectedRootId)
                                ?.suffixes.map((suffix) => {
                                  console.log("suffix", suffix)
                                  const isAssigned = isSuffixAssigned(selectedRootId, suffix.id)
                                  const assignedUser = isAssigned ? getAssignedUser(selectedRootId, suffix.id) : null

                                  return (
                                    <div
                                      key={suffix.id}
                                      className={`flex items-center justify-between p-2 rounded-md ${isAssigned ? "bg-muted/50" : "hover:bg-muted/30"
                                        }`}
                                    >
                                      <div className="flex items-center space-x-3">
                                        {!isAssigned && (
                                          <Checkbox
                                            id={`${suffix.id}`}
                                            checked={selectedSuffixIds.includes(suffix.id)}
                                            onCheckedChange={() => handleSuffixToggle(suffix.id)}
                                          />
                                        )}
                                        <label
                                          htmlFor={`${suffix.id}`}
                                          className={`flex items-center cursor-pointer ${isAssigned ? "opacity-70" : ""}`}
                                        >
                                          <span className="font-medium mr-2">{suffix.value}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {roots.find((r) => r.id === selectedRootId)?.value}
                                            {suffix.value}
                                          </Badge>
                                        </label>
                                      </div>
                                      {isAssigned && (
                                        <Badge variant="secondary" className="text-xs">
                                          Attribué à {assignedUser}
                                        </Badge>
                                      )}
                                    </div>
                                  )
                                })}
                              {roots.find((r) => r.id === selectedRootId)?.suffixes.length === 0 && (
                                <div className="text-center py-4 text-muted-foreground">
                                  Aucun suffixe disponible pour cette racine
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </Card>

                        {selectedSuffixIds.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground">
                              {selectedSuffixIds.length} suffixe(s) sélectionné(s)
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <Label htmlFor="user-select" className="block mb-2">
                        Affecter à l'utilisateur
                      </Label>
                      <Select onValueChange={setSelectedUserId}>
                        <SelectTrigger id="user-select">
                          <SelectValue placeholder="Sélectionner un utilisateur" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.firstname} {user.lastname}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      onClick={handleAddAssignment}
                      className="w-full"
                      disabled={!selectedRootId || !selectedUserId || (!assignByRoot && selectedSuffixIds.length === 0)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter l'affectation
                    </Button>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">Aperçu de l'affectation</h3>
                    <div className="space-y-4">
                      {selectedRootId ? (
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Badge variant="outline" className="mr-2">
                              Racine
                            </Badge>
                            <span className="font-medium">{roots.find((r) => r.id === selectedRootId)?.value || ""}</span>
                          </div>

                          {!assignByRoot && selectedSuffixIds.length > 0 && (
                            <div>
                              <div className="flex items-center mb-2">
                                <Badge variant="outline" className="mr-2">
                                  Suffixes ({selectedSuffixIds.length})
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-2 pl-4">
                                {selectedSuffixIds.map((suffixId) => {
                                  const suffix = roots
                                    .find((r) => r.id === selectedRootId)
                                    ?.suffixes.find((s) => s.id === suffixId)
                                  return (
                                    <Badge key={suffixId} variant="secondary" className="text-xs">
                                      {roots.find((r) => r.id === selectedRootId)?.value}
                                      {suffix?.value}
                                    </Badge>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {selectedUserId && (
                            <>
                              <div className="flex items-center justify-center my-2">
                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="flex items-center">
                                <Badge variant="outline" className="mr-2">
                                  Utilisateur
                                </Badge>
                                <span className="font-medium">{users.find((u) => u.id.toString() === selectedUserId)?.firstname} {users.find((u) => u.id.toString() === selectedUserId)?.lastname || ""}</span>
                              </div>
                            </>
                          )}

                          <div className="mt-4 pt-4 border-t">
                            <div className="text-sm text-muted-foreground">
                              {assignByRoot ? (
                                <p>
                                  Toutes les factures commençant par{" "}
                                  <strong>{roots.find((r) => r.id === selectedRootId)?.value}</strong> seront affectées à{" "}
                                  {selectedUserId ? (
                                    <strong>{users.find((u) => u.id.toString() === selectedUserId)?.firstname} {users.find((u) => u.id.toString() === selectedUserId)?.lastname}</strong>
                                  ) : (
                                    "l'utilisateur sélectionné"
                                  )}
                                  .
                                </p>
                              ) : (
                                <p>
                                  {selectedSuffixIds.length === 1 ? "La facture" : `Les ${selectedSuffixIds.length} factures`}{" "}
                                  sélectionnée{selectedSuffixIds.length > 1 ? "s" : ""} ser
                                  {selectedSuffixIds.length > 1 ? "ont" : "a"} affectée
                                  {selectedSuffixIds.length > 1 ? "s" : ""} à{" "}
                                  {selectedUserId ? (
                                    <strong>{users.find((u) => u.id.toString() === selectedUserId)?.firstname} {users.find((u) => u.id.toString() === selectedUserId)?.lastname}</strong>
                                  ) : (
                                    "l'utilisateur sélectionné"
                                  )}
                                  .
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Sélectionnez une racine et un utilisateur pour voir l'aperçu
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <CardHeader>
          <CardTitle>Affectations actuelles</CardTitle>
          <CardDescription>Liste de toutes les règles d'affectation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <Label htmlFor="search-assignments" className="mb-2 block">
                  Rechercher
                </Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-assignments"
                    placeholder="Rechercher par numéro, utilisateur..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-7 w-7 p-0"
                      onClick={() => setSearchTerm("")}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Effacer la recherche</span>
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="filter-user" className="mb-2 block">
                  Filtrer par utilisateur
                </Label>
                <Select value={filterUserId || ""} onValueChange={(value) => setFilterUserId(value || null)}>
                  <SelectTrigger id="filter-user" className="w-[200px]">
                    <SelectValue placeholder="Tous les utilisateurs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les utilisateurs</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.firstname} {user.lastname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filter-root" className="mb-2 block">
                  Filtrer par racine
                </Label>
                <Select value={filterRootId || ""} onValueChange={(value) => setFilterRootId(value || null)}>
                  <SelectTrigger id="filter-root" className="w-[200px]">
                    <SelectValue placeholder="Toutes les racines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les racines</SelectItem>
                    {roots.map((root) => (
                      <SelectItem key={root.id} value={root.id}>
                        {root.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(filterUserId || filterRootId || searchTerm) && (
                <div className="flex items-end">
                  <Button variant="outline" onClick={resetFilters}>
                    Réinitialiser les filtres
                  </Button>
                </div>
              )}
            </div>

            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Pattern</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Racine</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.length > 0 ? (
                    filteredAssignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <Badge variant={assignment.type === "root" ? "default" : "secondary"}>
                            {assignment.type === "root" ? "Racine" : "Suffixe"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{getAssignmentLabel(assignment)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span>{getUserName(assignment.userId)}</span>
                            {filterUserId === assignment.userId && (
                              <Badge variant="outline" className="ml-2">
                                Filtré
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span>{getRootName(assignment.rootId)}</span>
                            {filterRootId === assignment.rootId && (
                              <Badge variant="outline" className="ml-2">
                                Filtré
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {assignments.length === 0
                          ? "Aucune affectation créée. Utilisez le formulaire ci-dessus pour créer votre première affectation."
                          : "Aucune affectation ne correspond aux critères de filtrage."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <div>
                {filteredAssignments.length} affectation{filteredAssignments.length !== 1 ? "s" : ""}
                {(filterUserId || filterRootId || searchTerm) && " (filtrées)"}
              </div>
              <div>
                {assignments.length} affectation{assignments.length !== 1 ? "s" : ""} au total
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
