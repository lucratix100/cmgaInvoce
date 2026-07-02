"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
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
  CalendarDays,
  MapPin,
  Pencil,
  Plus,
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
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    agentId: defaultAgentId,
    dayOfWeek: "LUNDI" as CommercialPlanningDay,
    targets: [] as string[],
    sortOrder: "0",
    instructions: "",
  })
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  /* ── computed ─────────────────────────────────────────────── */

  const buildTargetOptions = (agentId: string) => {
    if (!agentId) return []
    return initialAssignments
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

  const selectedAgent = selectableAgents.find((a) => String(a.id) === filterAgent)
  const selectedAgentStats = agentStats.find(({ agent }) => String(agent.id) === filterAgent)
  const totalItems = portfolioOptions.length
  const selectedAgentPlanningCount = planning.filter((item) => String(item.agentId) === filterAgent).length
  const selectedAgentPortfolioCount = initialAssignments.filter(
    (assignment) => String(assignment.agentId) === filterAgent && assignment.isActive !== false
  ).length

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

  const changeAgent = (agentId: string) => {
    setFilterAgent(agentId)
    setForm((cur) => ({ ...cur, agentId, targets: [] }))
    setFocusDay("all")
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
                  active
                    ? `${s.bg} ring-1 ${s.ring} shadow-sm`
                    : "border bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {s.short}
                {count > 0 && (
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${s.dot}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

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
                onAdd={() => openAdd(day)}
                onEdit={openEdit}
                onRemove={remove}
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

      <CommercialTransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        agents={initialAgents}
        fromAgentId={filterAgent}
        portfolioCount={selectedAgentPortfolioCount}
        planningCount={selectedAgentPlanningCount}
        defaultTransferPortfolio={false}
        defaultTransferPlanning
        onSuccess={async () => {
          setPlanning(await getCommercialPlanning())
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
  onAdd,
  onEdit,
  onRemove,
}: {
  day: CommercialPlanningDay
  items: CommercialPlanningItem[]
  expanded: boolean
  onAdd: () => void
  onEdit: (item: CommercialPlanningItem) => void
  onRemove: (id: number) => void
}) {
  const s = DAY_STYLE[day]
  const isWeekend = day === "SAMEDI" || day === "DIMANCHE"

  return (
    <div className={`rounded-2xl border bg-white shadow-sm ${expanded ? "min-h-[360px]" : "min-h-[280px]"}`}>
      {/* header */}
      <div className={`flex items-center justify-between rounded-t-2xl px-4 py-3 ${s.bg}`}>
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
      <div className="space-y-2.5 p-3">
        {items.length === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-10 text-xs text-muted-foreground transition hover:border-primary/30 hover:bg-primary-50/30 hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        ) : (
          items.map((item) => {
            const isLocal = Boolean(item.commercialClientLocationId || item.commercialClientLocation || item.location)
            return (
              <div
                key={item.id}
                className="group relative rounded-xl border bg-white p-3.5 shadow-sm transition hover:shadow-md"
              >
                {/* badge ordre + type */}
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                    #{item.sortOrder || 0}
                  </span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    isLocal ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                  }`}>
                    {isLocal ? "Local" : "Individuel"}
                  </span>
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
                    onClick={() => onEdit(item)}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    title="Modifier"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

/* ─── helpers ───────────────────────────────────────────────── */

function formatPlanningTarget(item: CommercialPlanningItem) {
  const location = item.commercialClientLocation || item.location
  if (location) return `${location.client?.name || item.client?.name || "Magasin"} – ${location.name}`
  return item.client?.name || "-"
}

function getPlanningTargetValue(item: CommercialPlanningItem) {
  const location = item.commercialClientLocation || item.location
  const locationId = item.commercialClientLocationId || location?.id
  if (locationId) return `location:${locationId}`

  const clientId = item.commercialClientId || item.client?.id
  return clientId ? `client:${clientId}` : ""
}
