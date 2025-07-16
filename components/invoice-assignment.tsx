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
  const [selectedRootIds, setSelectedRootIds] = useState<string[]>([])
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
    if (!selectedRootIds.length || !selectedUserId) {
      setError("Veuillez sélectionner au moins une racine et un utilisateur")
      return
    }

    try {
      if (assignByRoot) {
        // Vérifier si les racines sont déjà affectées
        const existingAssignments = assignments.filter(
          (a) => a.type === "root" && selectedRootIds.includes(a.rootId)
        )
        if (existingAssignments.length > 0) {
          setError("Ces racines sont déjà affectées à un utilisateur. Veuillez les supprimer d'abord.")
          return
        }

        // Vérifier si des suffixes sont déjà affectés
        const hasSuffixAssignments = assignments.some(
          (a) => a.type === "suffix" && selectedRootIds.some(rootId => a.rootId === rootId)
        )
        if (hasSuffixAssignments) {
          setError("Des suffixes de ces racines sont déjà affectés. Veuillez les supprimer d'abord.")
          return
        }

        for (const rootId of selectedRootIds) {
        const newAssignment = await createAssignment(
            parseInt(rootId),
          null,
          parseInt(selectedUserId)
        )

        setAssignments([
          ...assignments,
          {
            id: newAssignment.id.toString(),
            type: "root",
              rootId: rootId,
            userId: selectedUserId,
            pattern: newAssignment.pattern
          },
        ])
        }
      } else {
        if (selectedSuffixIds.length === 0) {
          setError("Veuillez sélectionner au moins un suffixe")
          return
        }

        // Vérifier si les racines sont déjà entièrement affectées
        const existingRootAssignments = assignments.filter(
          (a) => a.type === "root" && selectedRootIds.includes(a.rootId)
        )
        if (existingRootAssignments.length > 0) {
          setError("Ces racines sont déjà entièrement affectées à un utilisateur. Veuillez les supprimer d'abord.")
          return
        }

        // Créer les affectations pour chaque suffixe sélectionné
        for (const suffixId of selectedSuffixIds) {
          console.log("Création d'affectation pour le suffixe:", suffixId)
          console.log("RootId:", selectedRootIds)
          console.log("UserId:", selectedUserId)

          for (const rootId of selectedRootIds) {
          const newAssignment = await createAssignment(
              parseInt(rootId),
            parseInt(suffixId),
            parseInt(selectedUserId)
          )

          setAssignments(prev => [
            ...prev,
            {
              id: newAssignment.id.toString(),
              type: "suffix",
                rootId: rootId,
              suffixId: suffixId,
              userId: selectedUserId,
              pattern: newAssignment.pattern
            },
          ])
          }
        }
      }

      // Réinitialiser la sélection
      setSelectedRootIds([])
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
    if (!selectedRootIds.length) return

    const availableSuffixes =
      roots
        .filter(r => selectedRootIds.includes(r.id))
        .flatMap(r => r.suffixes.filter(suffix => !isSuffixAssigned(r.id, suffix.id)))
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
          variant="default"
          className="flex items-center gap-2"
        >
          {showNewAssignment ? (
            <>
              <X className="h-4 w-4 " />
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
                      <Switch 
                        id="assign-mode" 
                        checked={assignByRoot} 
                        onCheckedChange={(checked) => {
                          setAssignByRoot(checked)
                          // Réinitialiser toutes les sélections lors du changement de mode
                          setSelectedRootIds([])
                          setSelectedSuffixIds([])
                          setError(null)
                        }} 
                      />
                      <Label htmlFor="assign-mode">{assignByRoot ? "Affecter par racine" : "Affecter par suffixe(s)"}</Label>
                    </div>

                    <div>
                      <Label htmlFor="root-select" className="block mb-2">
                        Sélectionner des racines
                      </Label>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                          {selectedRootIds.length} racine(s) sélectionnée(s)
                        </span>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              const availableRoots = roots.filter(root => {
                                const isRootAssigned = assignments.some(
                                  (a) => a.type === "root" && a.rootId === root.id
                                )
                                const hasSuffixAssignments = assignments.some(
                                  (a) => a.type === "suffix" && a.rootId === root.id
                                )
                                // Inclure les racines non affectées et celles avec des suffixes partiellement attribués
                                return !isRootAssigned && (!hasSuffixAssignments || !assignByRoot)
                              }).map(r => r.id)
                              setSelectedRootIds(availableRoots)
                            }}
                          >
                            Tout sélectionner
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setSelectedRootIds([])}
                          >
                            Tout désélectionner
                          </Button>
                        </div>
                      </div>
                      <Card className="border">
                        <ScrollArea className="h-[200px]">
                          <div className="p-4 space-y-2">
                            {roots.map((root) => {
                              const isRootAssigned = assignments.some(
                                (a) => a.type === "root" && a.rootId === root.id
                              )
                              const hasSuffixAssignments = assignments.some(
                                (a) => a.type === "suffix" && a.rootId === root.id
                              )
                              // Une racine est désactivée seulement si elle est entièrement affectée
                              // ou si elle a des suffixes attribués ET qu'on est en mode "affecter par racine"
                              const isDisabled = isRootAssigned || (hasSuffixAssignments && assignByRoot)

                              return (
                                <div
                                  key={root.id}
                                  className={`flex items-center justify-between p-2 rounded-md ${
                                    isDisabled ? "bg-muted/50" : "hover:bg-muted/30"
                                  }`}
                                >
                                  <div className="flex items-center space-x-3">
                                    {!isDisabled && (
                                      <Checkbox
                                        id={`root-${root.id}`}
                                        checked={selectedRootIds.includes(root.id)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedRootIds(prev => [...prev, root.id])
                                          } else {
                                            setSelectedRootIds(prev => prev.filter(id => id !== root.id))
                                          }
                                          setSelectedSuffixIds([])
                                          setError(null)
                                        }}
                                      />
                                    )}
                                    <label
                                      htmlFor={`root-${root.id}`}
                                      className={`flex items-center cursor-pointer ${isDisabled ? "opacity-70" : ""}`}
                                    >
                                      <span className="font-medium mr-2">{root.value}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {root.suffixes.length} suffixe{root.suffixes.length !== 1 ? "s" : ""}
                                      </Badge>
                                    </label>
                                  </div>
                                  {isRootAssigned && (
                                    <Badge variant="secondary" className="text-xs">
                                      Racine entièrement attribuée
                                    </Badge>
                                  )}
                                  {hasSuffixAssignments && !isRootAssigned && (
                                    <Badge variant="secondary" className="text-xs">
                                      {assignByRoot ? "Suffixes attribués" : "Suffixes partiellement attribués"}
                                    </Badge>
                                  )}
                                </div>
                              )
                            })}
                            {roots.length === 0 && (
                              <div className="text-center py-4 text-muted-foreground">
                                Aucune racine disponible
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </Card>
                    </div>

                    {!assignByRoot && selectedRootIds.length > 0 && (
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
                              {selectedRootIds.map(rootId => {
                                const root = roots.find(r => r.id === rootId)
                                if (!root) return null
                                
                                return (
                                  <div key={rootId} className="space-y-2">
                                    <div className="font-medium text-sm text-muted-foreground border-b pb-1">
                                      Racine: {root.value}
                                    </div>
                                    {root.suffixes.map((suffix) => {
                                      const isAssigned = isSuffixAssigned(rootId, suffix.id)
                                      const assignedUser = isAssigned ? getAssignedUser(rootId, suffix.id) : null

                                  return (
                                    <div
                                          key={`${rootId}-${suffix.id}`}
                                          className={`flex items-center justify-between p-2 rounded-md ml-4 ${
                                            isAssigned ? "bg-muted/50" : "hover:bg-muted/30"
                                        }`}
                                    >
                                      <div className="flex items-center space-x-3">
                                        {!isAssigned && (
                                          <Checkbox
                                                id={`${rootId}-${suffix.id}`}
                                            checked={selectedSuffixIds.includes(suffix.id)}
                                            onCheckedChange={() => handleSuffixToggle(suffix.id)}
                                          />
                                        )}
                                        <label
                                              htmlFor={`${rootId}-${suffix.id}`}
                                          className={`flex items-center cursor-pointer ${isAssigned ? "opacity-70" : ""}`}
                                        >
                                          <span className="font-medium mr-2">{suffix.value}</span>
                                          <Badge variant="outline" className="text-xs">
                                                {root.value}{suffix.value}
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
                                  </div>
                                )
                              })}
                              {selectedRootIds.length === 0 && (
                                <div className="text-center py-4 text-muted-foreground">
                                  Veuillez sélectionner au moins une racine
                                </div>
                              )}
                              {selectedRootIds.length > 0 && selectedRootIds.every(rootId => {
                                const root = roots.find(r => r.id === rootId)
                                return root && root.suffixes.length === 0
                              }) && (
                                <div className="text-center py-4 text-muted-foreground">
                                  Aucun suffixe disponible pour les racines sélectionnées
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
                      disabled={!selectedRootIds.length || !selectedUserId || (!assignByRoot && selectedSuffixIds.length === 0)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter l'affectation
                    </Button>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <h3 className="font-semibold text-blue-900">Aperçu de l'affectation</h3>
                    </div>
                    <div className="space-y-4">
                      {selectedRootIds.length > 0 ? (
                        <div className="space-y-4">
                          {/* Section Racines */}
                          <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="font-medium text-blue-900">Racines sélectionnées</span>
                              <Badge variant="outline" className="ml-auto bg-blue-50 text-blue-700 border-blue-200">
                                {selectedRootIds.length} racine{selectedRootIds.length > 1 ? 's' : ''}
                            </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedRootIds.map(id => {
                                const root = roots.find(r => r.id === id)
                                const assignedSuffixes = assignments.filter(a => 
                                  a.type === "suffix" && a.rootId === id
                                ).length
                                const totalSuffixes = root?.suffixes.length || 0
                                
                                return (
                                  <div key={id} className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                    <div className="font-medium text-blue-900">{root?.value}</div>
                                    <div className="text-xs text-blue-600">
                                      {assignedSuffixes}/{totalSuffixes} suffixes attribués
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Section Suffixes (si applicable) */}
                          {!assignByRoot && selectedSuffixIds.length > 0 && (
                            <div className="bg-white rounded-lg p-4 border border-green-100 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="font-medium text-green-900">Suffixes à affecter</span>
                                <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-200">
                                  {selectedSuffixIds.length} suffixe{selectedSuffixIds.length > 1 ? 's' : ''}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {selectedSuffixIds.map((suffixId) => {
                                  const rootWithSuffix = roots.find(r => 
                                    r.suffixes.some(s => s.id === suffixId)
                                  )
                                  const suffix = rootWithSuffix?.suffixes.find(s => s.id === suffixId)
                                  
                                  return (
                                    <Badge key={suffixId} variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                                      {rootWithSuffix?.value}{suffix?.value}
                                    </Badge>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Section Utilisateur */}
                          {selectedUserId && (
                            <div className="bg-white rounded-lg p-4 border border-purple-100 shadow-sm">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                <span className="font-medium text-purple-900">Utilisateur cible</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                  <span className="text-purple-700 font-semibold text-sm">
                                    {users.find((u) => u.id.toString() === selectedUserId)?.firstname?.charAt(0)}
                                    {users.find((u) => u.id.toString() === selectedUserId)?.lastname?.charAt(0)}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-medium text-purple-900">
                                    {users.find((u) => u.id.toString() === selectedUserId)?.firstname} {users.find((u) => u.id.toString() === selectedUserId)?.lastname}
                                  </div>
                                  <div className="text-sm text-purple-600">
                                    {users.find((u) => u.id.toString() === selectedUserId)?.email}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Section Résumé */}
                          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
                            <div className="flex items-center gap-2 mb-2">
                              <ArrowRight className="h-4 w-4" />
                              <span className="font-semibold">Résumé de l'action</span>
                            </div>
                            <div className="text-sm opacity-90">
                              {assignByRoot ? (
                                <p>
                                  <strong>{selectedRootIds.length} racine{selectedRootIds.length > 1 ? 's' : ''}</strong> seront entièrement affectée{selectedRootIds.length > 1 ? 's' : ''} à{" "}
                                    <strong>{users.find((u) => u.id.toString() === selectedUserId)?.firstname} {users.find((u) => u.id.toString() === selectedUserId)?.lastname}</strong>
                                  {selectedUserId ? "" : "l'utilisateur sélectionné"}.
                                  <br />
                                  <span className="opacity-75">
                                    Toutes les factures commençant par ces racines seront automatiquement assignées.
                                  </span>
                                </p>
                              ) : (
                                <p>
                                  <strong>{selectedSuffixIds.length} suffixe{selectedSuffixIds.length > 1 ? 's' : ''}</strong> ser{selectedSuffixIds.length > 1 ? 'ont' : 'a'} affecté{selectedSuffixIds.length > 1 ? 's' : ''} à{" "}
                                    <strong>{users.find((u) => u.id.toString() === selectedUserId)?.firstname} {users.find((u) => u.id.toString() === selectedUserId)?.lastname}</strong>
                                  {selectedUserId ? "" : "l'utilisateur sélectionné"}.
                                  <br />
                                  <span className="opacity-75">
                                    Seules les factures avec ces patterns spécifiques seront assignées.
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ArrowRight className="h-8 w-8 text-blue-500" />
                          </div>
                          <h4 className="font-medium text-blue-900 mb-2">Aucune sélection</h4>
                          <p className="text-sm text-blue-600">
                            Sélectionnez au moins une racine et un utilisateur pour voir l'aperçu de l'affectation
                          </p>
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
                <Select value={filterUserId || ""} onValueChange={(value) => setFilterUserId(value === "all" ? null : value)}>
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
                <Select value={filterRootId || ""} onValueChange={(value) => setFilterRootId(value === "all" ? null : value)}>
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
