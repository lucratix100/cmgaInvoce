"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { createAssignment, deleteAssignment, getAssignments } from "@/actions/assignment-actions"
import { createCommercialInitial, deleteCommercialInitial, updateCommercialInitial } from "@/actions/commercial-initials-actions"
import { CommercialUser } from "@/types/commercial"
import { ArrowRightLeft, Check, Pencil, Plus, Search, Trash2, X } from "lucide-react"

type Suffix = {
  id: string
  value: string
}

type Root = {
  id: string
  value: string
  suffixes: Suffix[]
}

type Assignment = {
  id: string
  type: "root" | "suffix"
  rootId: string
  suffixId?: string
  userId: string
  pattern: string
}

export function CommercialInvoiceAssignment({
  roots,
  agents,
}: {
  roots: Root[]
  agents: CommercialUser[]
}) {
  const [localRoots, setLocalRoots] = useState<Root[]>(roots)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState("")
  const [selectedRootIds, setSelectedRootIds] = useState<string[]>([])
  const [selectedSuffixIds, setSelectedSuffixIds] = useState<string[]>([])
  const [suffixRootId, setSuffixRootId] = useState("")
  const [newSuffix, setNewSuffix] = useState("")
  const [editingSuffixId, setEditingSuffixId] = useState("")
  const [editingSuffixValue, setEditingSuffixValue] = useState("")
  const [mode, setMode] = useState<"root" | "suffix">("root")
  const [search, setSearch] = useState("")
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const activeAgents = agents.filter((agent) => agent.isActive)
  const agentIds = useMemo(() => new Set(agents.map((agent) => String(agent.id))), [agents])

  const refresh = async () => {
    const data = await getAssignments()
    setAssignments(
      data
        .filter((assignment) => assignment.userId && agentIds.has(String(assignment.userId)))
        .map((assignment) => ({
          id: String(assignment.id),
          type: assignment.commercialInitialId ? "suffix" : "root",
          rootId: String(assignment.rootId),
          suffixId: assignment.commercialInitialId ? String(assignment.commercialInitialId) : undefined,
          userId: String(assignment.userId),
          pattern: assignment.pattern,
        }))
    )
  }

  useEffect(() => {
    refresh()
  }, [agentIds])

  useEffect(() => {
    setLocalRoots(roots)
  }, [roots])

  const selectedRoots = localRoots.filter((root) => selectedRootIds.includes(root.id))
  const availableSuffixes = selectedRoots.flatMap((root) =>
    root.suffixes.map((suffix) => ({
      ...suffix,
      rootId: root.id,
      label: `${root.value}${suffix.value}`,
    }))
  )

  const filteredAssignments = assignments.filter((assignment) => {
    const agent = activeAgents.find((item) => String(item.id) === assignment.userId)
    const haystack = `${assignment.pattern} ${agent?.firstname || ""} ${agent?.lastname || ""}`.toLowerCase()
    return haystack.includes(search.toLowerCase())
  })

  const toggleRoot = (rootId: string, checked: boolean) => {
    const root = localRoots.find((item) => item.id === rootId)
    setSelectedRootIds((current) => checked ? [...current, rootId] : current.filter((id) => id !== rootId))
    if (!checked && root) {
      const suffixIds = new Set(root.suffixes.map((suffix) => suffix.id))
      setSelectedSuffixIds((current) => current.filter((id) => !suffixIds.has(id)))
    }
  }

  const toggleSuffix = (rootId: string, suffixId: string, checked: boolean) => {
    if (checked) {
      setSelectedRootIds((current) => current.includes(rootId) ? current : [...current, rootId])
    }
    setSelectedSuffixIds((current) => checked ? [...current, suffixId] : current.filter((id) => id !== suffixId))
  }

  const addSuffix = (rootId = suffixRootId) => {
    startTransition(async () => {
      if (!rootId || !newSuffix.trim()) {
        toast({ title: "Erreur", description: "Choisissez une racine et renseignez un suffixe.", variant: "destructive" })
        return
      }

      const root = localRoots.find((item) => item.id === rootId)
      if (root?.suffixes.some((suffix) => suffix.value.toLowerCase() === newSuffix.trim().toLowerCase())) {
        toast({ title: "Erreur", description: "Ce suffixe existe déjà pour cette racine.", variant: "destructive" })
        return
      }

      try {
        const suffix = await createCommercialInitial(newSuffix.trim(), Number(rootId))
        setLocalRoots((current) =>
          current.map((rootItem) =>
            rootItem.id === rootId
              ? {
                ...rootItem,
                suffixes: [
                  ...rootItem.suffixes,
                  { id: String(suffix.id), value: suffix.name },
                ],
              }
              : rootItem
          )
        )
        setSelectedRootIds((current) => current.includes(rootId) ? current : [...current, rootId])
        setSelectedSuffixIds((current) => current.includes(String(suffix.id)) ? current : [...current, String(suffix.id)])
        setMode("suffix")
        setNewSuffix("")
        setSuffixRootId("")
        toast({ title: "Succès", description: "Suffixe créé sur la racine autorisée." })
      } catch (error: any) {
        toast({ title: "Erreur", description: error.message || "Impossible de créer le suffixe.", variant: "destructive" })
      }
    })
  }

  const startEditSuffix = (suffix: Suffix) => {
    setEditingSuffixId(suffix.id)
    setEditingSuffixValue(suffix.value)
  }

  const cancelEditSuffix = () => {
    setEditingSuffixId("")
    setEditingSuffixValue("")
  }

  const saveSuffix = (rootId: string, suffixId: string) => {
    startTransition(async () => {
      if (!editingSuffixValue.trim()) {
        toast({ title: "Erreur", description: "Le suffixe ne peut pas être vide.", variant: "destructive" })
        return
      }

      const root = localRoots.find((item) => item.id === rootId)
      if (root?.suffixes.some((suffix) => suffix.id !== suffixId && suffix.value.toLowerCase() === editingSuffixValue.trim().toLowerCase())) {
        toast({ title: "Erreur", description: "Ce suffixe existe déjà pour cette racine.", variant: "destructive" })
        return
      }

      try {
        const updatedSuffix = await updateCommercialInitial(Number(suffixId), editingSuffixValue.trim())
        setLocalRoots((current) =>
          current.map((rootItem) =>
            rootItem.id === rootId
              ? {
                ...rootItem,
                suffixes: rootItem.suffixes.map((suffix) =>
                  suffix.id === suffixId
                    ? { ...suffix, value: updatedSuffix.name }
                    : suffix
                ),
              }
              : rootItem
          )
        )
        cancelEditSuffix()
        toast({ title: "Succès", description: "Suffixe modifié." })
      } catch (error: any) {
        toast({ title: "Erreur", description: error.message || "Impossible de modifier le suffixe.", variant: "destructive" })
      }
    })
  }

  const removeSuffix = (rootId: string, suffixId: string) => {
    startTransition(async () => {
      try {
        await deleteCommercialInitial(Number(suffixId))
        setLocalRoots((current) =>
          current.map((rootItem) =>
            rootItem.id === rootId
              ? {
                ...rootItem,
                suffixes: rootItem.suffixes.filter((suffix) => suffix.id !== suffixId),
              }
              : rootItem
          )
        )
        setSelectedSuffixIds((current) => current.filter((id) => id !== suffixId))
        cancelEditSuffix()
        toast({ title: "Succès", description: "Suffixe supprimé." })
      } catch (error: any) {
        toast({ title: "Erreur", description: error.message || "Impossible de supprimer le suffixe.", variant: "destructive" })
      }
    })
  }

  const submit = () => {
    startTransition(async () => {
      if (!selectedAgentId || selectedRootIds.length === 0) {
        toast({ title: "Erreur", description: "Choisissez un commercial et au moins une racine.", variant: "destructive" })
        return
      }

      if (mode === "suffix" && selectedSuffixIds.length === 0) {
        toast({ title: "Erreur", description: "Choisissez au moins un suffixe.", variant: "destructive" })
        return
      }

      try {
        if (mode === "root") {
          for (const rootId of selectedRootIds) {
            await createAssignment(Number(rootId), null, Number(selectedAgentId))
          }
        } else {
          for (const suffixId of selectedSuffixIds) {
            const suffix = availableSuffixes.find((item) => item.id === suffixId)
            if (suffix) {
              await createAssignment(Number(suffix.rootId), Number(suffix.id), Number(selectedAgentId))
            }
          }
        }

        toast({ title: "Succès", description: "Affectation de factures enregistrée" })
        setSelectedRootIds([])
        setSelectedSuffixIds([])
        setSelectedAgentId("")
        await refresh()
      } catch (error) {
        toast({ title: "Erreur", description: "Impossible de créer l'affectation", variant: "destructive" })
      }
    })
  }

  const remove = (id: string) => {
    startTransition(async () => {
      try {
        await deleteAssignment(Number(id))
        await refresh()
        toast({ title: "Succès", description: "Affectation supprimée" })
      } catch (error) {
        toast({ title: "Erreur", description: "Impossible de supprimer l'affectation", variant: "destructive" })
      }
    })
  }

  const getAgentName = (userId: string) => {
    const agent = agents.find((item) => String(item.id) === userId)
    return agent ? `${agent.firstname} ${agent.lastname}` : "-"
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <Card className="h-fit border-none shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Nouvelle affectation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Commercial</Label>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger><SelectValue placeholder="Choisir un commercial" /></SelectTrigger>
              <SelectContent>
                {activeAgents.map((agent) => (
                  <SelectItem key={agent.id} value={String(agent.id)}>
                    {agent.firstname} {agent.lastname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Mode</Label>
            <Select value={mode} onValueChange={(value: "root" | "suffix") => {
              setMode(value)
              setSelectedSuffixIds([])
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="root">Par racine</SelectItem>
                <SelectItem value="suffix">Par suffixe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{mode === "suffix" ? "Racines et suffixes" : `Racines (${selectedRootIds.length})`}</Label>
            <div className="max-h-[420px] overflow-y-auto rounded-md border">
              {localRoots.map((root) => (
                <div key={root.id} className="border-b p-2 last:border-b-0 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedRootIds.includes(root.id)}
                      onCheckedChange={(checked) => toggleRoot(root.id, checked === true)}
                    />
                    <span className="text-sm font-medium">{root.value}</span>
                    <Badge variant="outline" className="ml-auto">{root.suffixes.length}</Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant={suffixRootId === root.id ? "default" : "ghost"}
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        setSuffixRootId(suffixRootId === root.id ? "" : root.id)
                        setNewSuffix("")
                      }}
                    >
                      + suffixe
                    </Button>
                  </div>
                  {suffixRootId === root.id && (
                    <div className="mt-2 flex gap-2 pl-7">
                      <Input
                        placeholder={`Suffixe pour ${root.value}`}
                        value={newSuffix}
                        onChange={(event) => setNewSuffix(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            addSuffix(root.id)
                          }
                        }}
                      />
                      <Button type="button" size="icon" onClick={() => addSuffix(root.id)} disabled={isPending}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {mode === "suffix" && (selectedRootIds.includes(root.id) || suffixRootId === root.id) && (
                    <div className="mt-2 space-y-1 rounded-md bg-white pl-7">
                      {root.suffixes.length === 0 ? (
                        <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                          Aucun suffixe pour cette racine. Utilisez + suffixe.
                        </div>
                      ) : (
                        root.suffixes.map((suffix) => (
                          <div key={suffix.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                            <Checkbox
                              checked={selectedSuffixIds.includes(suffix.id)}
                              onCheckedChange={(checked) => toggleSuffix(root.id, suffix.id, checked === true)}
                            />
                            {editingSuffixId === suffix.id ? (
                              <Input
                                value={editingSuffixValue}
                                onChange={(event) => setEditingSuffixValue(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault()
                                    saveSuffix(root.id, suffix.id)
                                  }
                                  if (event.key === "Escape") {
                                    cancelEditSuffix()
                                  }
                                }}
                                className="h-8 flex-1"
                              />
                            ) : (
                              <span className="flex-1 text-sm font-medium">{root.value}{suffix.value}</span>
                            )}
                            {editingSuffixId === suffix.id ? (
                              <>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-green-600"
                                  onClick={() => saveSuffix(root.id, suffix.id)}
                                  disabled={isPending}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={cancelEditSuffix}
                                  disabled={isPending}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => startEditSuffix(suffix)}
                                  disabled={isPending}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  onClick={() => removeSuffix(root.id, suffix.id)}
                                  disabled={isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button onClick={submit} disabled={isPending || !selectedAgentId || selectedRootIds.length === 0} className="w-full">
            Affecter au commercial
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Affectations factures</CardTitle>
            <Badge variant="outline">{filteredAssignments.length} règle(s)</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-10 w-full rounded-md border bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Rechercher une règle ou un commercial..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pattern</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Commercial</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Aucune affectation facture.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{assignment.pattern}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{assignment.type === "root" ? "Racine" : "Suffixe"}</Badge>
                      </TableCell>
                      <TableCell>{getAgentName(assignment.userId)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => remove(assignment.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
