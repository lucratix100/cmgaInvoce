"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Building, Users, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { getDepotAssignments, createDepotAssignment, deleteDepotAssignment } from "@/actions/depot-assignment-actions"
import { getRecouvrementUsers } from "@/actions/user"
import { getActiveDepots } from "@/actions/depot"

// Types
type User = {
  id: number
  firstname: string
  lastname: string
  email: string
  role: string
}

type Depot = {
  id: number
  name: string
  isActive: boolean
}

type DepotAssignment = {
  id: number
  userId: number
  depotId: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  user?: User
  depot?: Depot
}

export function DepotAssignment() {
  const [showNewAssignment, setShowNewAssignment] = useState(false)
  const [assignments, setAssignments] = useState<DepotAssignment[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [depots, setDepots] = useState<Depot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedDepotId, setSelectedDepotId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Filtres
  const [filterUserId, setFilterUserId] = useState<string | null>(null)
  const [filterDepotId, setFilterDepotId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Charger les données
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assignmentsData, usersData, depotsData] = await Promise.all([
          getDepotAssignments(),
          getRecouvrementUsers(),
          getActiveDepots()
        ])
        
        setAssignments(assignmentsData)
        setUsers(usersData)
        setDepots(depotsData)
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error)
        toast.error("Erreur lors du chargement des données")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleAddAssignment = async () => {
    if (!selectedUserId || !selectedDepotId) {
      setError("Veuillez sélectionner un utilisateur et un dépôt")
      return
    }

    try {
      const newAssignment = await createDepotAssignment(
        parseInt(selectedUserId),
        parseInt(selectedDepotId)
      )

      setAssignments([...assignments, newAssignment])
      setSelectedUserId(null)
      setSelectedDepotId(null)
      setError(null)
      toast.success("Affectation créée avec succès")
    } catch (error) {
      console.error("Erreur lors de la création de l'affectation:", error)
      toast.error("Erreur lors de la création de l'affectation")
    }
  }

  const handleDeleteAssignment = async (id: number) => {
    try {
      await deleteDepotAssignment(id)
      setAssignments(assignments.filter((a) => a.id !== id))
      toast.success("Affectation supprimée avec succès")
    } catch (error) {
      console.error("Erreur lors de la suppression de l'affectation:", error)
      toast.error("Erreur lors de la suppression de l'affectation")
    }
  }

  const getUserName = (userId: number) => {
    const user = users.find((u) => u.id === userId)
    return user ? `${user.firstname} ${user.lastname}` : "Utilisateur inconnu"
  }

  const getDepotName = (depotId: number) => {
    const depot = depots.find((d) => d.id === depotId)
    return depot ? depot.name : "Dépôt inconnu"
  }

  // Filtrer les affectations
  const filteredAssignments = assignments.filter((assignment) => {
    if (filterUserId && assignment.userId !== parseInt(filterUserId)) {
      return false
    }
    if (filterDepotId && assignment.depotId !== parseInt(filterDepotId)) {
      return false
    }
    if (searchTerm) {
      const userName = getUserName(assignment.userId).toLowerCase()
      const depotName = getDepotName(assignment.depotId).toLowerCase()
      return userName.includes(searchTerm.toLowerCase()) || depotName.includes(searchTerm.toLowerCase())
    }
    return true
  })

  const resetFilters = () => {
    setFilterUserId(null)
    setFilterDepotId(null)
    setSearchTerm("")
  }

  if (loading) {
    return <div>Chargement...</div>
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
              <X className="h-4 w-4" />
              Masquer
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Nouvelle Affectation par Dépôt
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
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Nouvelle Affectation par Dépôt
                </CardTitle>
                <CardDescription>
                  Affectez un utilisateur de recouvrement à un ou plusieurs dépôts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="user-select" className="block mb-2">
                        Sélectionner un utilisateur de recouvrement
                      </Label>
                      <Select onValueChange={setSelectedUserId}>
                        <SelectTrigger id="user-select">
                          <SelectValue placeholder="Sélectionner un utilisateur" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.firstname} {user.lastname} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="depot-select" className="block mb-2">
                        Sélectionner un dépôt
                      </Label>
                      <Select onValueChange={setSelectedDepotId}>
                        <SelectTrigger id="depot-select">
                          <SelectValue placeholder="Sélectionner un dépôt" />
                        </SelectTrigger>
                        <SelectContent>
                          {depots.map((depot) => (
                            <SelectItem key={depot.id} value={depot.id.toString()}>
                              {depot.name}
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
                      disabled={!selectedUserId || !selectedDepotId}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Créer l'affectation
                    </Button>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <h3 className="font-semibold text-blue-900">Aperçu de l'affectation</h3>
                    </div>
                    <div className="space-y-4">
                      {selectedUserId && selectedDepotId ? (
                        <div className="space-y-4">
                          <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                              <Users className="h-4 w-4 text-blue-500" />
                              <span className="font-medium text-blue-900">Utilisateur</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-700 font-semibold text-sm">
                                  {users.find(u => u.id.toString() === selectedUserId)?.firstname?.charAt(0)}
                                  {users.find(u => u.id.toString() === selectedUserId)?.lastname?.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-blue-900">
                                  {users.find(u => u.id.toString() === selectedUserId)?.firstname} {users.find(u => u.id.toString() === selectedUserId)?.lastname}
                                </div>
                                <div className="text-sm text-blue-600">
                                  {users.find(u => u.id.toString() === selectedUserId)?.email}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white rounded-lg p-4 border border-green-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                              <Building className="h-4 w-4 text-green-500" />
                              <span className="font-medium text-green-900">Dépôt</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <Building className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <div className="font-medium text-green-900">
                                  {depots.find(d => d.id.toString() === selectedDepotId)?.name}
                                </div>
                                <div className="text-sm text-green-600">
                                  Toutes les factures de ce dépôt seront visibles
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-blue-500 to-green-600 rounded-lg p-4 text-white">
                            <div className="text-sm">
                              <p>
                                <strong>{users.find(u => u.id.toString() === selectedUserId)?.firstname} {users.find(u => u.id.toString() === selectedUserId)?.lastname}</strong> 
                                {" "}aura accès à toutes les factures du dépôt{" "}
                                <strong>{depots.find(d => d.id.toString() === selectedDepotId)?.name}</strong>.
                              </p>
                              <p className="mt-2 opacity-75 text-xs">
                                ⚠️ Cette affectation prime sur les affectations par racine
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building className="h-8 w-8 text-blue-500" />
                          </div>
                          <h4 className="font-medium text-blue-900 mb-2">Aucune sélection</h4>
                          <p className="text-sm text-blue-600">
                            Sélectionnez un utilisateur et un dépôt pour voir l'aperçu
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
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Affectations par Dépôt
          </CardTitle>
          <CardDescription>
            Liste de toutes les affectations d'utilisateurs par dépôt (priorité sur les affectations par racine)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <Label htmlFor="search-assignments" className="mb-2 block">
                  Rechercher
                </Label>
                <Input
                  id="search-assignments"
                  placeholder="Rechercher par utilisateur ou dépôt..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
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
                <Label htmlFor="filter-depot" className="mb-2 block">
                  Filtrer par dépôt
                </Label>
                <Select value={filterDepotId || ""} onValueChange={(value) => setFilterDepotId(value === "all" ? null : value)}>
                  <SelectTrigger id="filter-depot" className="w-[200px]">
                    <SelectValue placeholder="Tous les dépôts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les dépôts</SelectItem>
                    {depots.map((depot) => (
                      <SelectItem key={depot.id} value={depot.id.toString()}>
                        {depot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(filterUserId || filterDepotId || searchTerm) && (
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
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Dépôt</TableHead>
                    <TableHead>Date de création</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.length > 0 ? (
                    filteredAssignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-700 font-semibold text-xs">
                                {getUserName(assignment.userId).split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium">{getUserName(assignment.userId)}</div>
                              <div className="text-sm text-muted-foreground">
                                {users.find(u => u.id === assignment.userId)?.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{getDepotName(assignment.depotId)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(assignment.createdAt).toLocaleDateString('fr-FR')}
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
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {assignments.length === 0
                          ? "Aucune affectation par dépôt créée. Utilisez le formulaire ci-dessus pour créer votre première affectation."
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
                {(filterUserId || filterDepotId || searchTerm) && " (filtrées)"}
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