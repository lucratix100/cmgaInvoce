"use client"

import { Fragment, useEffect, useMemo, useRef, useState, useTransition, type DragEvent } from "react"
import { flushSync } from "react-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  createCommercialPlanning,
  deactivateCommercialPlanning,
  generateCommercialPlanning,
  getCommercialAssignments,
  getCommercialPlanning,
  updateCommercialPlanning,
} from "@/actions/commercial-admin"
import {
  CommercialAssignment,
  CommercialPlanningDay,
  CommercialPlanningItem,
  CommercialUser,
} from "@/types/commercial"
import {
  Ban,
  CalendarDays,
  GripVertical,
  MapPin,
  Pencil,
  Plus,
  Shuffle,
  Trash2,
  User,
  ArrowRightLeft,
} from "lucide-react"
import CommercialTransferDialog from "@/components/commercial-admin/commercial-transfer-dialog"

/* ─── constantes ────────────────────────────────────────────── */

const DAYS: CommercialPlanningDay[] = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"]

const DAY_STYLE: Record<CommercialPlanningDay, { label: string; short: string; bg: string; ring: string; dot: string }> = {
  LUNDI:    { label: "Lundi",    short: "Lun", bg: "bg-blue-50",    ring: "ring-blue-200",    dot: "bg-blue-500"    },
  MARDI:    { label: "Mardi",    short: "Mar", bg: "bg-violet-50",  ring: "ring-violet-200",  dot: "bg-violet-500"  },
  MERCREDI: { label: "Mercredi", short: "Mer", bg: "bg-emerald-50", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  JEUDI:    { label: "Jeudi",    short: "Jeu", bg: "bg-amber-50",   ring: "ring-amber-200",   dot: "bg-amber-500"   },
  VENDREDI: { label: "Vendredi", short: "Ven", bg: "bg-orange-50",  ring: "ring-orange-200",  dot: "bg-orange-500"  },
  SAMEDI:   { label: "Samedi",   short: "Sam", bg: "bg-rose-50",    ring: "ring-rose-200",    dot: "bg-rose-400"    },
  DIMANCHE: { label: "Dimanche", short: "Dim", bg: "bg-gray-50",    ring: "ring-gray-200",    dot: "bg-gray-400"    },
}

const AVATAR_COLORS = ["bg-blue-500","bg-violet-500","bg-emerald-500","bg-orange-500","bg-rose-500","bg-cyan-500","bg-amber-500","bg-indigo-500"]
const avatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length]

function getInitials(agent: CommercialUser) {
  return `${agent.firstname?.[0] || ""}${agent.lastname?.[0] || ""}`.toUpperCase() || "?"
}

/* ─── composant principal ───────────────────────────────────── */

export default function CommercialPlanningClient({
  initialAgents,
  initialAssignments,
  initialPlanning,
}: {
  initialAgents: CommercialUser[]
  initialAssignments: CommercialAssignment[]
  initialPlanning: CommercialPlanningItem[]
}) {
  const activeAgents = initialAgents.filter((agent) => agent.isActive !== false)

  const [planning, setPlanning] = useState(initialPlanning)
  const [assignments, setAssignments] = useState(initialAssignments)

  const selectableAgents = useMemo(() => {
    if (activeAgents.length > 0) return activeAgents
    const agentIds = new Set(planning.map((item) => String(item.agentId)))
    return initialAgents.filter((agent) => agentIds.has(String(agent.id)))
  }, [activeAgents, initialAgents, planning])

  const defaultAgentId = selectableAgents[0]?.id != null ? String(selectableAgents[0].id) : ""
  const [filterAgent, setFilterAgent] = useState(defaultAgentId)
  const [focusDay, setFocusDay] = useState<CommercialPlanningDay | "all">("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [randomOpen, setRandomOpen] = useState(false)
  const [randomMode, setRandomMode] = useState<"replace" | "fill">("replace")
  const [secondVisit, setSecondVisit] = useState(false)
  const [randomDraft, setRandomDraft] = useState<RandomSlot[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    agentId: defaultAgentId,
    dayOfWeek: "LUNDI" as CommercialPlanningDay,
    targets: [] as string[],
    sortOrder: "0",
    instructions: "",
  })
  const [isPending, startTransition] = useTransition()
  const [dragId, setDragId] = useState<number | null>(null)
  const [dropHint, setDropHint] = useState<{ day: CommercialPlanningDay; index: number } | null>(null)
  const dragIdRef = useRef<number | null>(null)
  const dropHintRef = useRef<{ day: CommercialPlanningDay; index: number } | null>(null)
  const { toast } = useToast()

  /* ── computed ─────────────────────────────────────────────── */

  const buildTargetOptions = (agentId: string) => {
    if (!agentId) return []
    return assignments
      .filter((a) => String(a.agentId) === agentId && a.isActive)
      .map((a) => {
        const location = a.commercialClientLocation || a.location
        const locationId = location?.id || a.commercialClientLocationId
        if (locationId) {
          return {
            value: `location:${locationId}`,
            label: `${location?.client?.name || a.client?.name || "Magasin"} – ${location?.name || `Local #${locationId}`}`,
            type: "location" as const,
          }
        }
        return {
          value: `client:${a.client?.id || a.commercialClientId}`,
          label: a.client?.name || "Client",
          type: "client" as const,
        }
      })
  }

  const portfolioOptions = buildTargetOptions(filterAgent)
  const targetOptions   = buildTargetOptions(form.agentId)

  const agentStats = useMemo(
    () =>
      selectableAgents.map((agent) => {
        const items = planning.filter((p) => String(p.agentId) === String(agent.id))
        return {
          agent,
          total: items.length,
          covered: new Set(items.map((p) => p.dayOfWeek)).size,
        }
      }),
    [selectableAgents, planning]
  )

  const filteredPlanning = planning.filter((item) => {
    if (!filterAgent) return false
    const okAgent = String(item.agentId) === filterAgent
    const okDay = focusDay === "all" || item.dayOfWeek === focusDay
    return okAgent && okDay
  })

  const groupedPlanning = useMemo(() =>
    DAYS.reduce((acc, day) => {
      acc[day] = filteredPlanning
        .filter((p) => p.dayOfWeek === day)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      return acc
    }, {} as Record<CommercialPlanningDay, CommercialPlanningItem[]>)
  , [filteredPlanning])

  const draggedItem = dragId == null ? null : planning.find((item) => item.id === dragId) ?? null
  const blockedDays = useMemo(() => {
    const blocked = new Set<CommercialPlanningDay>()
    if (!draggedItem) return blocked
    const target = getPlanningTargetValue(draggedItem)
    if (!target) return blocked
    for (const item of planning) {
      if (item.id === draggedItem.id) continue
      if (String(item.agentId) !== String(draggedItem.agentId)) continue
      if (item.dayOfWeek === draggedItem.dayOfWeek) continue
      if (getPlanningTargetValue(item) === target) blocked.add(item.dayOfWeek)
    }
    return blocked
  }, [draggedItem, planning])

  const selectedAgent = selectableAgents.find((a) => String(a.id) === filterAgent)
  const selectedAgentStats = agentStats.find(({ agent }) => String(agent.id) === filterAgent)
  const totalItems = portfolioOptions.length

  useEffect(() => {
    if (filterAgent && selectableAgents.some((agent) => String(agent.id) === filterAgent)) {
      return
    }
    if (defaultAgentId) {
      setFilterAgent(defaultAgentId)
    }
  }, [defaultAgentId, filterAgent, selectableAgents])

  /* ── actions ──────────────────────────────────────────────── */

  const refresh = async () => setPlanning(await getCommercialPlanning())

  const openAdd = (day?: CommercialPlanningDay) => {
    setEditingId(null)
    setForm({
      agentId: filterAgent || defaultAgentId,
      dayOfWeek: day || "LUNDI",
      targets: [],
      sortOrder: String(day ? (groupedPlanning[day]?.length || 0) + 1 : 0),
      instructions: "",
    })
    setDialogOpen(true)
  }

  const openEdit = (item: CommercialPlanningItem) => {
    setEditingId(item.id)
    setForm({
      agentId: String(item.agentId),
      dayOfWeek: item.dayOfWeek,
      targets: [
        item.commercialClientLocationId
          ? `location:${item.commercialClientLocationId}`
          : `client:${item.commercialClientId}`,
      ],
      sortOrder: String(item.sortOrder || 0),
      instructions: item.instructions || "",
    })
    setDialogOpen(true)
  }

  const submit = () => {
    startTransition(async () => {
      const targetsToSave = editingId ? form.targets.slice(0, 1) : form.targets
      const duplicateTargets = targetsToSave.filter((target) =>
        getPlannedDaysForTarget(target, form.agentId).includes(form.dayOfWeek)
      )

      if (duplicateTargets.length > 0) {
        toast({
          title: "Doublon planning",
          description: "Cette cible est déjà planifiée pour ce commercial le même jour.",
          variant: "destructive",
        })
        return
      }

      for (const [index, target] of targetsToSave.entries()) {
        const [targetType, targetId] = target.split(":")
        const payload = {
          agentId: Number(form.agentId),
          dayOfWeek: form.dayOfWeek,
          commercialClientId: targetType === "client" ? Number(targetId) : undefined,
          commercialClientLocationId: targetType === "location" ? Number(targetId) : undefined,
          sortOrder: Number(form.sortOrder || 0) + index,
          instructions: form.instructions,
        }
        const result = editingId
          ? await updateCommercialPlanning(editingId, payload)
          : await createCommercialPlanning(payload)

        if (!result.success) {
          toast({ title: "Erreur", description: result.error, variant: "destructive" })
          return
        }
      }

      toast({
        title: "Succès",
        description: editingId ? "Programme modifié" : `${targetsToSave.length} cible(s) ajoutée(s) au planning`,
      })
      setDialogOpen(false)
      await refresh()
    })
  }

  const remove = (id: number) => {
    startTransition(async () => {
      const result = await deactivateCommercialPlanning(id)
      if (!result.success) { toast({ title: "Erreur", description: result.error, variant: "destructive" }); return }
      toast({ title: "Succès", description: "Retiré du planning" })
      await refresh()
    })
  }

  const setHint = (day: CommercialPlanningDay, index: number) => {
    if (dropHintRef.current?.day === day && dropHintRef.current.index === index) return
    const next = { day, index }
    dropHintRef.current = next
    setDropHint(next)
  }

  const clearDrag = () => {
    window.setTimeout(() => {
      dragIdRef.current = null
      dropHintRef.current = null
      setDragId(null)
      setDropHint(null)
    }, 0)
  }

  const startDrag = (id: number) => {
    dragIdRef.current = id
    setDragId(id)
  }

  const dropOnDay = (day: CommercialPlanningDay) => {
    const movedId = dragIdRef.current
    const hint = dropHintRef.current
    clearDrag()
    if (!movedId || !hint || hint.day !== day || isPending) return

    const moved = planning.find((item) => item.id === movedId)
    if (!moved || String(moved.agentId) !== filterAgent) return

    const sourceDay = moved.dayOfWeek
    const sourceList = planning
      .filter((item) => String(item.agentId) === filterAgent && item.dayOfWeek === sourceDay)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    const destList = sourceDay === day
      ? sourceList
      : planning
          .filter((item) => String(item.agentId) === filterAgent && item.dayOfWeek === day)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))

    const fromIndex = sourceList.findIndex((item) => item.id === movedId)
    let insertionIndex = hint.index
    if (sourceDay === day && fromIndex >= 0 && fromIndex < insertionIndex) insertionIndex -= 1
    insertionIndex = Math.max(0, Math.min(insertionIndex, destList.filter((item) => item.id !== movedId).length))
    if (sourceDay === day && insertionIndex === fromIndex) return

    if (sourceDay !== day) {
      const targetValue = getPlanningTargetValue(moved)
      const duplicate = destList.some(
        (item) => item.id !== moved.id && getPlanningTargetValue(item) === targetValue
      )
      if (duplicate) {
        toast({
          title: "Doublon planning",
          description: `Cette cible est déjà planifiée le ${DAY_STYLE[day].label.toLowerCase()}.`,
          variant: "destructive",
        })
        return
      }
    }

    const nextDest = destList.filter((item) => item.id !== movedId)
    nextDest.splice(insertionIndex, 0, { ...moved, dayOfWeek: day })
    const nextSource = sourceDay === day ? nextDest : sourceList.filter((item) => item.id !== movedId)

    const renumber = (items: CommercialPlanningItem[], targetDay: CommercialPlanningDay) =>
      items.map((item, index) => ({ ...item, dayOfWeek: targetDay, sortOrder: index + 1 }))

    const numberedDest = renumber(nextDest, day)
    const numberedSource = sourceDay === day ? numberedDest : renumber(nextSource, sourceDay)
    const nextById = new Map<number, CommercialPlanningItem>()
    for (const item of [...numberedSource, ...numberedDest]) nextById.set(item.id, item)

    const changed = [...nextById.values()].filter((item) => {
      const previous = planning.find((entry) => entry.id === item.id)
      return !previous || previous.dayOfWeek !== item.dayOfWeek || Number(previous.sortOrder || 0) !== item.sortOrder
    })
    if (changed.length === 0) return

    const previousPlanning = planning
    const nextPlanning = planning.map((item) => {
      const next = nextById.get(item.id)
      return next ? { ...item, dayOfWeek: next.dayOfWeek, sortOrder: next.sortOrder } : item
    })
    flushSync(() => setPlanning(nextPlanning))

    void (async () => {
      const results = await Promise.all(
        changed.map((item) =>
          updateCommercialPlanning(item.id, toPlanningPayload(nextById.get(item.id) || item), { revalidate: false })
        )
      )
      const failed = results.find((result) => !result.success)
      if (failed && !failed.success) {
        setPlanning(previousPlanning)
        toast({
          title: "Déplacement impossible",
          description: failed.error || "Le planning n'a pas pu être mis à jour.",
          variant: "destructive",
        })
        return
      }
      setPlanning(nextPlanning)
      toast({
        title: sourceDay === day ? "Ordre mis à jour" : "Programme déplacé",
        description:
          sourceDay === day
            ? `Ordre du ${DAY_STYLE[day].label.toLowerCase()} enregistré.`
            : `${formatPlanningTarget(moved)} est maintenant le ${DAY_STYLE[day].label.toLowerCase()}.`,
      })
    })()
  }

  const changeAgent = (agentId: string) => {
    setFilterAgent(agentId)
    setForm((cur) => ({ ...cur, agentId, targets: [] }))
    setFocusDay("all")
  }

  const drawRandomPlanning = (mode: "replace" | "fill", withSecondVisit: boolean) => {
    const existing = planning.filter((item) => String(item.agentId) === filterAgent && item.isActive !== false)
    setRandomDraft(buildRandomPlanning({
      targets: portfolioOptions,
      existing,
      mode,
      secondVisit: withSecondVisit,
    }))
  }

  const openRandomPlanning = () => {
    setRandomMode("replace")
    setSecondVisit(false)
    drawRandomPlanning("replace", false)
    setRandomOpen(true)
  }

  const saveRandomPlanning = () => {
    if (!filterAgent || randomDraft.length === 0) return
    startTransition(async () => {
      const result = await generateCommercialPlanning({
        agentId: Number(filterAgent),
        replace: randomMode === "replace",
        items: randomDraft.map((slot) => ({
          commercialClientId: slot.commercialClientId,
          commercialClientLocationId: slot.commercialClientLocationId,
          dayOfWeek: slot.day,
          sortOrder: slot.sortOrder,
        })),
      })
      if (!result.success) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" })
        return
      }
      setPlanning(await getCommercialPlanning())
      setRandomOpen(false)
      toast({
        title: "Planning généré",
        description: randomMode === "replace"
          ? `${randomDraft.length} visite(s) ont remplacé le planning.`
          : `${randomDraft.length} visite(s) ajoutée(s) sur les jours vides.`,
      })
    })
  }

  const toggleTarget = (value: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      targets: editingId
        ? checked ? [value] : []
        : checked
          ? [...current.targets, value]
          : current.targets.filter((target) => target !== value),
    }))
  }

  const getPlannedDaysForTarget = (targetValue: string, agentId: string) => {
    return planning
      .filter((item) => String(item.agentId) === agentId && getPlanningTargetValue(item) === targetValue && item.id !== editingId)
      .map((item) => item.dayOfWeek)
      .filter((day, index, allDays) => allDays.indexOf(day) === index)
      .sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b))
  }

  /* ── render ───────────────────────────────────────────────── */

  return (
    <div className="space-y-4">

        {/* Sélection du commercial */}
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/10 bg-gradient-to-br from-primary-50 to-white p-3 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3 xl:min-w-[360px]">
            {selectedAgent ? (
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow ${avatarColor(selectedAgent.id)}`}>
                {getInitials(selectedAgent)}
              </div>
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-200 text-sm font-bold text-gray-500">
                ?
              </div>
            )}
            <div className="min-w-0 flex-1">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-primary/60">Planning de</Label>
              <Select
                value={filterAgent || undefined}
                onValueChange={changeAgent}
                disabled={selectableAgents.length === 0}
              >
                <SelectTrigger className="mt-1 h-9 rounded-xl bg-white font-semibold shadow-sm">
                  <SelectValue placeholder="Sélectionnez un commercial" />
                </SelectTrigger>
                <SelectContent>
                  {selectableAgents.map((agent) => {
                    const stats = agentStats.find(({ agent: a }) => String(a.id) === String(agent.id))
                    const total = stats?.total ?? 0
                    const covered = stats?.covered ?? 0
                    return (
                      <SelectItem key={agent.id} value={String(agent.id)}>
                        {agent.firstname} {agent.lastname} · {covered}j · {total} programme{total > 1 ? "s" : ""}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {selectableAgents.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">Aucun commercial disponible.</p>
              )}
            </div>
          </div>
          {selectedAgent && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-sm shadow-sm">
                <User className="h-4 w-4 text-blue-500" />
                <span className="font-semibold">{selectableAgents.length}</span>
                <span className="text-muted-foreground text-xs">commerciaux</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-sm shadow-sm">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="font-semibold">{filteredPlanning.length}</span>
                <span className="text-muted-foreground text-xs">programme(s)</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-sm shadow-sm">
                <Badge className="h-5 rounded-full bg-primary/10 px-2 text-primary hover:bg-primary/10">
                  {selectedAgentStats?.covered || 0}j
                </Badge>
                <span className="text-muted-foreground text-xs">planifiés</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-sm shadow-sm">
                <User className="h-4 w-4 text-emerald-500" />
                <span className="font-semibold">{totalItems}</span>
                <span className="text-muted-foreground text-xs">cible(s) portef.</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl shadow-sm"
                onClick={openRandomPlanning}
                disabled={!filterAgent || portfolioOptions.length === 0}
              >
                <Shuffle className="mr-1.5 h-4 w-4" />
                Au hasard
              </Button>
              <Button size="sm" className="rounded-xl shadow-sm" onClick={() => openAdd()}>
                <Plus className="mr-1.5 h-4 w-4" />
                Ajouter
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl shadow-sm"
                onClick={() => setTransferDialogOpen(true)}
                disabled={!filterAgent}
              >
                <ArrowRightLeft className="mr-1.5 h-4 w-4" />
                Transférer
              </Button>
            </div>
          )}
        </div>

        {/* filtre jours */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFocusDay("all")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              focusDay === "all"
                ? "bg-primary text-white shadow-sm"
                : "border bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Toute la semaine
          </button>
          {DAYS.map((day) => {
            const s = DAY_STYLE[day]
            const count = groupedPlanning[day]?.length || 0
            const active = focusDay === day
            return (
              <button
                key={day}
                type="button"
                onClick={() => setFocusDay(active ? "all" : day)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  blockedDays.has(day)
                    ? "border border-red-300 bg-red-50 text-red-700"
                    : active
                      ? `${s.bg} ring-1 ${s.ring} shadow-sm`
                      : "border bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {s.short}
                {blockedDays.has(day) && <Ban className="h-3.5 w-3.5 text-red-500" />}
                {count > 0 && (
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${s.dot}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Glissez une carte pour changer de jour ou réordonner les visites. Le symbole d'interdiction signale un client déjà planifié ce jour.
        </p>

        {/* colonnes jours */}
        <div className={`grid gap-4 ${
          focusDay === "all"
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6"
            : "grid-cols-1"
        }`}>
          {DAYS
            .filter((day) => focusDay === "all" || focusDay === day)
            .map((day) => (
              <DayColumn
                key={day}
                day={day}
                items={groupedPlanning[day] || []}
                expanded={focusDay === day}
                dragId={dragId}
                dropIndex={dropHint?.day === day ? dropHint.index : null}
                blocked={blockedDays.has(day)}
                blockedTarget={draggedItem ? getPlanningTargetValue(draggedItem) : ""}
                disabled={isPending}
                onAdd={() => openAdd(day)}
                onEdit={openEdit}
                onRemove={remove}
                onDragStart={startDrag}
                onDragEnd={clearDrag}
                onDragHover={setHint}
                onDrop={() => dropOnDay(day)}
              />
            ))}
        </div>
      {/* ── dialog ajout/édition ──────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              {editingId ? "Modifier le programme" : "Ajouter au planning"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Commercial</Label>
                <Select value={form.agentId} onValueChange={(v) => setForm({ ...form, agentId: v, targets: [] })}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {selectableAgents.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.firstname} {a.lastname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Jour</Label>
                <Select value={form.dayOfWeek} onValueChange={(v: CommercialPlanningDay) => setForm({ ...form, dayOfWeek: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => <SelectItem key={d} value={d}>{DAY_STYLE[d].label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label>Cibles du portefeuille</Label>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{targetOptions.length} disponible(s)</span>
                  <Badge variant="outline">{form.targets.length} sélectionnée(s)</Badge>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-xl border bg-white">
                {targetOptions.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">Aucune cible dans ce portefeuille.</div>
                ) : (
                  targetOptions.map((option) => {
                    const plannedDays = getPlannedDaysForTarget(option.value, form.agentId)
                    const alreadyPlannedThisDay = plannedDays.includes(form.dayOfWeek)
                    return (
                      <label
                        key={option.value}
                        className={`flex items-start gap-3 border-b px-3 py-2.5 last:border-b-0 ${
                          alreadyPlannedThisDay
                            ? "cursor-not-allowed bg-red-50/60 opacity-70"
                            : "cursor-pointer hover:bg-gray-50"
                        }`}
                      >
                        <Checkbox
                          checked={form.targets.includes(option.value)}
                          disabled={alreadyPlannedThisDay}
                          onCheckedChange={(checked) => toggleTarget(option.value, checked === true)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            {option.type === "location" ? (
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                            ) : (
                              <User className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            )}
                            <span className="truncate">{option.label}</span>
                          </span>
                          {plannedDays.length > 0 && (
                            <span className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                              Déjà planifiée :
                              {plannedDays.map((day) => (
                                <span
                                  key={day}
                                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                    day === form.dayOfWeek ? "bg-red-100 text-red-700" : DAY_STYLE[day].bg
                                  }`}
                                >
                                  {DAY_STYLE[day].short}
                                </span>
                              ))}
                            </span>
                          )}
                          {alreadyPlannedThisDay && (
                            <span className="mt-1 block text-xs font-medium text-red-600">
                              Déjà dans le planning de ce jour
                            </span>
                          )}
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Une cible peut être planifiée sur plusieurs jours, mais jamais deux fois le même jour.
              </p>
            </div>

            <Textarea
              placeholder="Instructions pour le commercial (optionnel)..."
              className="min-h-[80px] resize-none"
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={submit} disabled={isPending || !form.agentId || form.targets.length === 0}>
                {editingId ? "Enregistrer" : "Ajouter au planning"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={randomOpen} onOpenChange={setRandomOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shuffle className="h-5 w-5 text-primary" />
              Planning au hasard
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Les {portfolioOptions.length} cible(s) du portefeuille de{" "}
              <span className="font-medium text-foreground">
                {selectedAgent ? `${selectedAgent.firstname} ${selectedAgent.lastname}` : "ce commercial"}
              </span>{" "}
              sont réparties du lundi au samedi.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRandomMode("replace")
                  drawRandomPlanning("replace", secondVisit)
                }}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                  randomMode === "replace" ? "border-primary bg-primary/5 font-medium" : "bg-white hover:bg-muted/40"
                }`}
              >
                Remplacer
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">Efface le planning actuel</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRandomMode("fill")
                  drawRandomPlanning("fill", secondVisit)
                }}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                  randomMode === "fill" ? "border-primary bg-primary/5 font-medium" : "bg-white hover:bg-muted/40"
                }`}
              >
                Compléter
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">Seulement les jours vides</span>
              </button>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2">
              <Checkbox
                checked={secondVisit}
                onCheckedChange={(checked) => {
                  const next = checked === true
                  setSecondVisit(next)
                  drawRandomPlanning(randomMode, next)
                }}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">Seconde visite dans la semaine</span>
                <span className="block text-xs text-muted-foreground">Chaque cible peut revenir un autre jour.</span>
              </span>
            </label>
            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {randomDraft.length === 0 ? (
                <p className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                  {randomMode === "fill"
                    ? "Aucun jour vide : le planning de la semaine est déjà rempli."
                    : "Aucune cible à placer."}
                </p>
              ) : (
                DAYS.map((day) => {
                  const slots = randomDraft.filter((slot) => slot.day === day)
                  if (slots.length === 0) return null
                  return (
                    <div key={day}>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {DAY_STYLE[day].label} · {slots.length}
                      </p>
                      <div className="space-y-1">
                        {slots.map((slot) => (
                          <div key={`${slot.day}-${slot.key}-${slot.sortOrder}`} className="truncate rounded-lg bg-muted/40 px-2 py-1 text-sm">
                            {slot.sortOrder}. {slot.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => drawRandomPlanning(randomMode, secondVisit)}
                disabled={isPending || portfolioOptions.length === 0}
              >
                Relancer
              </Button>
              <Button onClick={saveRandomPlanning} disabled={isPending || randomDraft.length === 0}>
                {isPending ? "Enregistrement..." : "Enregistrer ce planning"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CommercialTransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        agents={initialAgents}
        fromAgentId={filterAgent}
        assignments={assignments}
        planningItems={planning}
        defaultTransferPortfolio={false}
        defaultTransferPlanning
        onSuccess={async () => {
          const [nextPlanning, nextAssignments] = await Promise.all([
            getCommercialPlanning(),
            getCommercialAssignments(),
          ])
          setPlanning(nextPlanning)
          setAssignments(nextAssignments)
        }}
      />
    </div>
  )
}

/* ─── DayColumn ─────────────────────────────────────────────── */

function DayColumn({
  day,
  items,
  expanded,
  dragId,
  dropIndex,
  blocked,
  blockedTarget,
  disabled,
  onAdd,
  onEdit,
  onRemove,
  onDragStart,
  onDragEnd,
  onDragHover,
  onDrop,
}: {
  day: CommercialPlanningDay
  items: CommercialPlanningItem[]
  expanded: boolean
  dragId: number | null
  dropIndex: number | null
  blocked: boolean
  blockedTarget: string
  disabled: boolean
  onAdd: () => void
  onEdit: (item: CommercialPlanningItem) => void
  onRemove: (id: number) => void
  onDragStart: (id: number) => void
  onDragEnd: () => void
  onDragHover: (day: CommercialPlanningDay, index: number) => void
  onDrop: () => void
}) {
  const s = DAY_STYLE[day]
  const isWeekend = day === "SAMEDI" || day === "DIMANCHE"
  const dragIndex = dragId == null ? -1 : items.findIndex((item) => item.id === dragId)
  const isDropTarget = dropIndex != null
  const showLineAt = (index: number) => {
    if (blocked || dropIndex !== index) return false
    if (dragIndex >= 0 && (index === dragIndex || index === dragIndex + 1)) return false
    return true
  }
  const markDrop = (event: DragEvent) => {
    event.dataTransfer.dropEffect = blocked ? "none" : "move"
  }

  return (
    <div
      onDragOver={(event) => {
        if (!dragId) return
        event.preventDefault()
        markDrop(event)
      }}
      onDrop={(event) => {
        event.preventDefault()
        onDrop()
      }}
      className={`relative rounded-2xl border bg-white shadow-sm transition ${expanded ? "min-h-[360px]" : "min-h-[280px]"} ${
        blocked
          ? "ring-2 ring-red-300 bg-red-50/50"
          : isDropTarget
            ? `ring-2 ${s.ring}`
            : ""
      }`}
    >
      {/* header */}
      <div
        className={`flex items-center justify-between rounded-t-2xl px-4 py-3 ${s.bg}`}
        onDragOver={(event) => {
          if (!dragId) return
          event.preventDefault()
          markDrop(event)
          event.stopPropagation()
          onDragHover(day, 0)
        }}
      >
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
          <h3 className={`text-sm font-bold ${isWeekend ? "text-gray-500" : "text-gray-800"}`}>
            {s.label}
          </h3>
          {items.length > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white ${s.dot}`}>
              {items.length}
            </span>
          )}
          {blocked && (
            <span title="Ce client est déjà planifié ce jour" className="inline-flex text-red-500">
              <Ban className="h-4 w-4" />
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg p-1 text-gray-400 transition hover:bg-white/80 hover:text-primary"
          title={`Ajouter – ${s.label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* items */}
      <div
        className="space-y-2.5 p-3"
        onDragOver={(event) => {
          if (!dragId) return
          event.preventDefault()
          markDrop(event)
          if (event.target !== event.currentTarget) return
          const cards = event.currentTarget.querySelectorAll("[data-planning-card]")
          const lastCard = cards[cards.length - 1]
          if (lastCard && event.clientY < lastCard.getBoundingClientRect().bottom) return
          onDragHover(day, items.length)
        }}
      >
        {items.length === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            onDragOver={(event) => {
              if (!dragId) return
              event.preventDefault()
              markDrop(event)
              event.stopPropagation()
              onDragHover(day, 0)
            }}
            className={`flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-10 text-xs transition ${
              isDropTarget
                ? "border-primary bg-primary/5 text-primary"
                : "text-muted-foreground hover:border-primary/30 hover:bg-primary-50/30 hover:text-primary"
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            {dragId ? "Déposer ici" : "Ajouter"}
          </button>
        ) : (
          items.map((item, index) => {
            const isLocal = Boolean(item.commercialClientLocationId || item.commercialClientLocation || item.location)
            const isDragging = dragId === item.id
            const isConflict = blocked && getPlanningTargetValue(item) === blockedTarget
            return (
              <Fragment key={item.id}>
              {showLineAt(index) && <div className="h-1 rounded-full bg-primary" />}
              <div
                data-planning-card
                draggable={!disabled}
                onDragStart={(event) => {
                  if ((event.target as HTMLElement).closest("[data-no-drag]")) {
                    event.preventDefault()
                    return
                  }
                  event.dataTransfer.effectAllowed = "move"
                  event.dataTransfer.setData("text/plain", String(item.id))
                  onDragStart(item.id)
                }}
                onDragEnd={onDragEnd}
                onDragOver={(event) => {
                  if (!dragId) return
                  event.preventDefault()
                  markDrop(event)
                  event.stopPropagation()
                  const rect = event.currentTarget.getBoundingClientRect()
                  const after = event.clientY > rect.top + rect.height / 2
                  onDragHover(day, index + (after ? 1 : 0))
                }}
                className={`group relative rounded-xl border bg-white p-3.5 shadow-sm transition hover:shadow-md ${
                  disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"
                } ${isDragging ? "opacity-40" : ""} ${isConflict ? "border-red-300 bg-red-50" : ""}`}
              >
                {/* badge ordre + type */}
                <div className="mb-1.5 flex items-center gap-1.5">
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                    #{item.sortOrder || index + 1}
                  </span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    isLocal ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                  }`}>
                    {isLocal ? "Local" : "Individuel"}
                  </span>
                  {isConflict && (
                    <Ban className="ml-auto h-4 w-4 shrink-0 text-red-500" />
                  )}
                </div>

                <p className="truncate text-xs font-semibold text-gray-900 leading-snug">
                  {formatPlanningTarget(item)}
                </p>

                {item.instructions && (
                  <p className="mt-1.5 line-clamp-2 flex items-start gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    {item.instructions}
                  </p>
                )}

                {/* actions au survol */}
                <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    data-no-drag
                    draggable={false}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={() => onEdit(item)}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    title="Modifier"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    data-no-drag
                    draggable={false}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={() => onRemove(item.id)}
                    className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              </Fragment>
            )
          })
        )}
        {items.length > 0 && showLineAt(items.length) && <div className="h-1 rounded-full bg-primary" />}
      </div>
      {blocked && isDropTarget && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-red-50/80">
          <div className="flex flex-col items-center gap-1 text-red-600">
            <Ban className="h-8 w-8" />
            <span className="text-xs font-semibold">Déjà planifié</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── helpers ───────────────────────────────────────────────── */

function formatPlanningTarget(item: CommercialPlanningItem) {
  const location = item.commercialClientLocation || item.location
  if (location) return `${location.client?.name || item.client?.name || "Magasin"} – ${location.name}`
  return item.client?.name || "-"
}

function toPlanningPayload(item: CommercialPlanningItem) {
  const locationId = item.commercialClientLocationId || item.commercialClientLocation?.id || item.location?.id || null
  const clientId = item.commercialClientId || item.client?.id || null
  return {
    agentId: Number(item.agentId),
    dayOfWeek: item.dayOfWeek,
    commercialClientId: locationId ? null : clientId,
    commercialClientLocationId: locationId,
    sortOrder: item.sortOrder,
    instructions: item.instructions ?? null,
  }
}

type RandomSlot = {
  key: string
  label: string
  day: CommercialPlanningDay
  sortOrder: number
  commercialClientId?: number
  commercialClientLocationId?: number
}

function shuffleItems<T>(items: T[]) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = copy[index]
    copy[index] = copy[swapIndex]
    copy[swapIndex] = current
  }
  return copy
}

function parsePlanningTarget(value: string) {
  const [type, rawId] = value.split(":")
  const id = Number(rawId)
  if (!id) return null
  if (type === "location") return { commercialClientLocationId: id }
  if (type === "client") return { commercialClientId: id }
  return null
}

function buildRandomPlanning({
  targets,
  existing,
  mode,
  secondVisit,
}: {
  targets: Array<{ value: string; label: string }>
  existing: CommercialPlanningItem[]
  mode: "replace" | "fill"
  secondVisit: boolean
}) {
  const occupied = new Map<string, Set<CommercialPlanningDay>>()
  const dayCounts = new Map<CommercialPlanningDay, number>(DAYS.map((day) => [day, 0]))

  if (mode === "fill") {
    for (const item of existing) {
      if (!DAYS.includes(item.dayOfWeek)) continue
      const key = getPlanningTargetValue(item)
      if (!key) continue
      const days = occupied.get(key) || new Set<CommercialPlanningDay>()
      days.add(item.dayOfWeek)
      occupied.set(key, days)
      dayCounts.set(item.dayOfWeek, (dayCounts.get(item.dayOfWeek) || 0) + 1)
    }
  }

  const openDays = DAYS.filter((day) => mode === "replace" || (dayCounts.get(day) || 0) === 0)
  if (openDays.length === 0) return []

  const visits = secondVisit ? 2 : 1
  const buckets = new Map<CommercialPlanningDay, RandomSlot[]>(openDays.map((day) => [day, []]))
  let cursor = Math.floor(Math.random() * openDays.length)

  for (const target of shuffleItems(targets)) {
    const parsed = parsePlanningTarget(target.value)
    if (!parsed) continue
    const used = new Set(occupied.get(target.value) || [])
    const needed = Math.max(0, visits - used.size)
    for (let visit = 0; visit < needed; visit++) {
      let chosen: CommercialPlanningDay | null = null
      for (let attempt = 0; attempt < openDays.length; attempt++) {
        const day = openDays[(cursor + attempt) % openDays.length]
        if (used.has(day)) continue
        chosen = day
        cursor = (openDays.indexOf(day) + 1) % openDays.length
        break
      }
      if (!chosen) break
      used.add(chosen)
      const list = buckets.get(chosen) || []
      list.push({
        key: target.value,
        label: target.label,
        day: chosen,
        sortOrder: list.length + 1 + (mode === "fill" ? dayCounts.get(chosen) || 0 : 0),
        ...parsed,
      })
      buckets.set(chosen, list)
    }
  }

  return DAYS.flatMap((day) => buckets.get(day) || [])
}

function getPlanningTargetValue(item: CommercialPlanningItem) {
  const location = item.commercialClientLocation || item.location
  const locationId = item.commercialClientLocationId || location?.id
  if (locationId) return `location:${locationId}`

  const clientId = item.commercialClientId || item.client?.id
  return clientId ? `client:${clientId}` : ""
}
