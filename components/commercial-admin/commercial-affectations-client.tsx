"use client"

import { useMemo, useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  createCommercialAssignment,
  deactivateCommercialAssignment,
  getCommercialAssignmentHistories,
  getCommercialAssignments,
  getCommercialClients,
  getCommercialPlanning,
} from "@/actions/commercial-admin"
import {
  CommercialAssignment,
  CommercialClient,
  CommercialUser,
} from "@/types/commercial"
import {
  ArrowRightLeft,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ChevronRight,
  Clock,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Store,
  Trash2,
  User,
  UsersRound,
} from "lucide-react"
import CommercialTransferDialog from "@/components/commercial-admin/commercial-transfer-dialog"

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-indigo-500",
]

function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length]
}

export default function CommercialAffectationsClient({
  initialAgents,
  initialClients,
  initialAssignments,
  initialHistories,
}: {
  initialAgents: CommercialUser[]
  initialClients: CommercialClient[]
  initialAssignments: CommercialAssignment[]
  initialHistories: any[]
}) {
  const activeAgents = initialAgents.filter((agent) => agent.isActive)
  const defaultAgentId = activeAgents[0]?.id ? String(activeAgents[0].id) : ""

  const [clients, setClients] = useState(initialClients)
  const [assignments, setAssignments] = useState(initialAssignments)
  const [histories, setHistories] = useState(initialHistories)
  const [assignmentForm, setAssignmentForm] = useState({
    agentId: defaultAgentId,
    enseigneId: "all",
    targets: [] as string[],
    note: "",
  })
  const [selectedAgent, setSelectedAgent] = useState(defaultAgentId)
  const [targetSearch, setTargetSearch] = useState("")
  const [targetPickerSearch, setTargetPickerSearch] = useState("")
  const [expandedEnseignes, setExpandedEnseignes] = useState<string[]>([])
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [planningCountByAgent, setPlanningCountByAgent] = useState<Record<string, number>>({})
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  /* ─── computed ─────────────────────────────────────────────── */

  const assignedTargetValues = useMemo(() => new Set(
    assignments.map((a) =>
      a.commercialClientLocationId
        ? `location:${a.commercialClientLocationId}`
        : `client:${a.commercialClientId}`
    )
  ), [assignments])

  const targetOptions = useMemo(() => {
    return clients.flatMap((client) => {
      if (!client.isActive) return []
      if (client.type === "INDIVIDUEL") {
        return [{ value: `client:${client.id}`, label: client.name, type: "client" as const, enseigneId: null }]
      }
      return (client.locations || [])
        .filter((l) => l.isActive)
        .map((l) => ({ value: `location:${l.id}`, label: `${client.name} – ${l.name}`, type: "location" as const, enseigneId: client.id }))
    })
  }, [clients])

  const availableTargetOptions = targetOptions.filter((o) => !assignedTargetValues.has(o.value))
  const activeEnseignes = clients.filter((c) => c.type === "MAGASIN" && c.isActive)
  const displayedTargetOptions = availableTargetOptions.filter((o) =>
    (assignmentForm.enseigneId === "all" || String(o.enseigneId) === assignmentForm.enseigneId) &&
    o.label.toLowerCase().includes(targetPickerSearch.toLowerCase())
  )

  const selectedAgentAssignments = assignments.filter((a) => String(a.agentId) === selectedAgent)
  const selectedPortfolioStats = selectedAgentAssignments.reduce(
    (s, a) => { const loc = a.commercialClientLocation || a.location; if (loc) s.locations++; else s.clients++; return s },
    { clients: 0, locations: 0 }
  )
  const filteredAssignments = selectedAgentAssignments.filter((a) =>
    targetSearch ? formatAssignmentTarget(a).toLowerCase().includes(targetSearch.toLowerCase()) : true
  )

  const groupedPortfolio = useMemo(() => {
    const enseigneMap = new Map<string, {
      id: string
      name: string
      locations: CommercialAssignment[]
    }>()
    const individuals: CommercialAssignment[] = []

    filteredAssignments.forEach((assignment) => {
      const location = assignment.commercialClientLocation || assignment.location
      if (!location) {
        individuals.push(assignment)
        return
      }

      const enseigneId = String(location.client?.id || assignment.client?.id || assignment.commercialClientId || `store-${assignment.id}`)
      const enseigneName = location.client?.name || assignment.client?.name || "Enseigne"
      const existing = enseigneMap.get(enseigneId)

      if (existing) {
        existing.locations.push(assignment)
      } else {
        enseigneMap.set(enseigneId, {
          id: enseigneId,
          name: enseigneName,
          locations: [assignment],
        })
      }
    })

    return {
      enseignes: Array.from(enseigneMap.values()),
      individuals,
    }
  }, [filteredAssignments])

  const agentOptions = activeAgents.map((agent) => {
    const count = assignments.filter((a) => String(a.agentId) === String(agent.id)).length
    return { agent, count }
  })

  const selectedAgentData = initialAgents.find((a) => String(a.id) === selectedAgent)
  const assignedTargetCount = assignments.length
  const targetCount = targetOptions.length
  const unassignedTargetCount = availableTargetOptions.length

  /* ─── actions ───────────────────────────────────────────────── */

  const refresh = async () => {
    const [nextClients, nextAssignments, nextHistories] = await Promise.all([
      getCommercialClients(),
      getCommercialAssignments(),
      getCommercialAssignmentHistories(),
    ])
    setClients(nextClients)
    setAssignments(nextAssignments)
    setHistories(nextHistories)
  }

  const submitAssignment = () => {
    startTransition(async () => {
      for (const target of assignmentForm.targets) {
        const [targetType, targetId] = target.split(":")
        const result = await createCommercialAssignment({
          agentId: Number(assignmentForm.agentId),
          commercialClientId: targetType === "client" ? Number(targetId) : undefined,
          commercialClientLocationId: targetType === "location" ? Number(targetId) : undefined,
          note: assignmentForm.note,
        })
        if (!result.success) {
          toast({ title: "Erreur", description: result.error, variant: "destructive" })
          await refresh()
          return
        }
      }
      toast({ title: "Succès", description: `${assignmentForm.targets.length} cible(s) ajoutée(s)` })
      setSelectedAgent(assignmentForm.agentId)
      setAssignmentForm({ agentId: assignmentForm.agentId, enseigneId: "all", targets: [], note: "" })
      setAssignmentDialogOpen(false)
      await refresh()
    })
  }

  const openAssignmentDialog = () => {
    setAssignmentForm({ agentId: selectedAgent || defaultAgentId, enseigneId: "all", targets: [], note: "" })
    setTargetPickerSearch("")
    setAssignmentDialogOpen(true)
  }

  const openTransferDialog = () => {
    startTransition(async () => {
      const planning = await getCommercialPlanning()
      const counts = planning.reduce<Record<string, number>>((acc, item) => {
        const key = String(item.agentId)
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {})
      setPlanningCountByAgent(counts)
      setTransferDialogOpen(true)
    })
  }

  const selectAgent = (agentId: string) => {
    setSelectedAgent(agentId)
    setTargetSearch("")
    setAssignmentForm((cur) => ({ ...cur, agentId, targets: [] }))
  }

  const toggleTarget = (value: string, checked: boolean) => {
    setAssignmentForm((cur) => ({
      ...cur,
      targets: checked ? [...cur.targets, value] : cur.targets.filter((t) => t !== value),
    }))
  }

  const selectEnseigneTargets = (value: string) => {
    setAssignmentForm((cur) => ({
      ...cur,
      enseigneId: value,
      targets: value === "all" ? [] : availableTargetOptions.filter((o) => String(o.enseigneId) === value).map((o) => o.value),
    }))
  }

  const deactivate = (assignmentId: number) => {
    startTransition(async () => {
      const result = await deactivateCommercialAssignment(assignmentId)
      if (!result.success) { toast({ title: "Erreur", description: result.error, variant: "destructive" }); return }
      toast({ title: "Succès", description: "Cible retirée du portefeuille" })
      await refresh()
    })
  }

  const toggleEnseigne = (enseigneId: string) => {
    setExpandedEnseignes((current) =>
      current.includes(enseigneId)
        ? current.filter((id) => id !== enseigneId)
        : [...current, enseigneId]
    )
  }

  /* ─── render ────────────────────────────────────────────────── */

  return (
    <Tabs defaultValue="portefeuilles" className="space-y-3">
      {/* ── onglets ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <TabsList className="h-9">
          <TabsTrigger value="portefeuilles" className="h-8 px-4 text-sm">Portefeuilles</TabsTrigger>
          <TabsTrigger value="historique" className="flex h-8 items-center gap-1.5 px-4 text-sm">
            <Clock className="h-3.5 w-3.5" />
            Historique
          </TabsTrigger>
        </TabsList>
      </div>

      {/* ══ TAB PORTEFEUILLES ════════════════════════════════ */}
      <TabsContent value="portefeuilles" className="mt-0 space-y-3">

        {/* stats */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard color="blue"   label="Commerciaux"     value={activeAgents.length}      icon={<UsersRound className="h-4 w-4" />} />
          <StatCard color="violet" label="En portefeuille" value={assignedTargetCount}       icon={<BriefcaseBusiness className="h-4 w-4" />} />
          <StatCard color="emerald"label="Cibles actives"  value={targetCount}               icon={<Building2 className="h-4 w-4" />} />
          <StatCard color="amber"  label="Hors portefeuille" value={unassignedTargetCount}   icon={<ArrowRightLeft className="h-4 w-4" />} />
        </div>

        {/* ── panneau portefeuille ───────────────────────── */}
        <div className="space-y-3">
            {/* entête commercial sélectionné */}
            {selectedAgentData ? (
              <div className="overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm">
                <div className="flex flex-col gap-3 bg-gradient-to-br from-primary-50 via-white to-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-md ${avatarColor(selectedAgentData.id)}`}>
                    {getInitials(selectedAgentData)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/60">Portefeuille de</p>
                    <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Select value={selectedAgent} onValueChange={selectAgent}>
                        <SelectTrigger className="h-10 w-full rounded-xl bg-white text-sm shadow-sm sm:w-[360px]">
                          <SelectValue placeholder="Choisir un commercial" />
                        </SelectTrigger>
                        <SelectContent>
                          {agentOptions.map(({ agent, count }) => (
                            <SelectItem key={agent.id} value={String(agent.id)}>
                              {agent.firstname} {agent.lastname} · {count} cible(s)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedAgentData.phone && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 text-primary/60" />
                          {selectedAgentData.phone}
                        </span>
                      )}
                      {selectedAgentData.email && (
                        <span className="inline-flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 text-primary/60" />
                          {selectedAgentData.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                  <div className="flex flex-wrap items-center gap-2">
                  <div className="flex h-8 items-center gap-1.5 rounded-lg border bg-white px-2.5 shadow-sm">
                    <BriefcaseBusiness className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-sm font-semibold">{selectedAgentAssignments.length}</span>
                    <span className="text-xs text-muted-foreground">cibles</span>
                  </div>
                  <div className="flex h-8 items-center gap-1.5 rounded-lg border bg-white px-2.5 shadow-sm">
                    <User className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-sm font-semibold">{selectedPortfolioStats.clients}</span>
                    <span className="text-xs text-muted-foreground">clients</span>
                  </div>
                  <div className="flex h-8 items-center gap-1.5 rounded-lg border bg-white px-2.5 shadow-sm">
                    <MapPin className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-sm font-semibold">{selectedPortfolioStats.locations}</span>
                    <span className="text-xs text-muted-foreground">locaux</span>
                  </div>
                  <Button size="sm" className="h-9 rounded-lg px-3 text-sm shadow-sm" onClick={openAssignmentDialog}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Ajouter
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-lg px-3 text-sm shadow-sm"
                    onClick={openTransferDialog}
                    disabled={!selectedAgent}
                  >
                    <ArrowRightLeft className="mr-1 h-3.5 w-3.5" />
                    Transférer
                  </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed bg-gray-50 text-center">
                <UsersRound className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Sélectionnez un commercial</p>
              </div>
            )}

            {/* recherche + cibles */}
            {selectedAgent && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="h-10 w-full rounded-xl border bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Rechercher dans ce portefeuille..."
                    value={targetSearch}
                    onChange={(e) => setTargetSearch(e.target.value)}
                  />
                </div>

                {filteredAssignments.length === 0 ? (
                  <div className="flex min-h-[190px] flex-col items-center justify-center rounded-2xl border border-dashed text-center">
                    <ArrowRightLeft className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="font-medium">Aucune cible en portefeuille</p>
                    <p className="text-sm text-muted-foreground">Cliquez sur «&nbsp;Ajouter des cibles&nbsp;» pour commencer.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                    {groupedPortfolio.enseignes.map((enseigne) => {
                      const isExpanded = expandedEnseignes.includes(enseigne.id) || Boolean(targetSearch)
                      return (
                        <div key={enseigne.id} className="border-b last:border-b-0">
                          <button
                            type="button"
                            onClick={() => toggleEnseigne(enseigne.id)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
                          >
                            <span className="shrink-0 text-muted-foreground">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                              <Store className="h-3.5 w-3.5" />
                              Enseigne
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-gray-900">{enseigne.name}</p>
                            </div>
                            <Badge variant="outline" className="shrink-0">
                              {enseigne.locations.length} local(aux)
                            </Badge>
                          </button>

                          {isExpanded && (
                            <div className="border-t bg-gray-50/60">
                              {enseigne.locations.map((assignment) => {
                                const location = assignment.commercialClientLocation || assignment.location
                                return (
                                  <div
                                    key={assignment.id}
                                    className="group ml-9 flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0 hover:bg-white"
                                  >
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                      <MapPin className="h-3.5 w-3.5" />
                                      Local
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-semibold text-gray-900">
                                        {location?.name || formatAssignmentTarget(assignment)}
                                      </p>
                                      {(location?.address || assignment.note) && (
                                        <p className="truncate text-xs text-muted-foreground">
                                          {location?.address || assignment.note}
                                        </p>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => deactivate(assignment.id)}
                                      disabled={isPending}
                                      className="shrink-0 rounded-lg p-1 text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                                      title="Retirer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {groupedPortfolio.individuals.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="group flex items-center gap-3 border-b px-4 py-3 transition last:border-b-0 hover:bg-gray-50"
                      >
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <User className="h-3.5 w-3.5" />
                          Individuel
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold leading-snug text-gray-900">
                            {formatAssignmentTarget(assignment)}
                          </p>
                          {assignment.note && (
                            <p className="truncate text-xs text-muted-foreground">{assignment.note}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => deactivate(assignment.id)}
                          disabled={isPending}
                          className="shrink-0 rounded-lg p-1 text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                          title="Retirer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
      </TabsContent>

      {/* ══ TAB HISTORIQUE ═══════════════════════════════════ */}
      <TabsContent value="historique" className="mt-0">
        <Card className="border shadow-sm">
          <CardHeader className="px-3 py-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" />
                Historique des portefeuilles
              </CardTitle>
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{histories.length} activité(s)</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            {histories.length === 0 ? (
              <div className="flex min-h-[130px] flex-col items-center justify-center rounded-lg border border-dashed text-center">
                <Clock className="mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Aucune activité enregistrée.</p>
              </div>
            ) : (
              <div className="space-y-0 divide-y rounded-lg border bg-white">
                {histories.map((history) => {
                  const { bg, text, dot } = actionStyle(history.action)
                  return (
                    <div key={history.id} className="flex items-start gap-2.5 px-3 py-2 transition hover:bg-gray-50/60">
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${bg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${bg} ${text}`}>
                            {formatAction(history.action)}
                          </span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-[11px] font-medium text-gray-700">{formatPerson(history.agent)}</span>
                          {formatHistoryTarget(history) !== "-" && (
                            <>
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className="truncate text-[11px] text-muted-foreground">{formatHistoryTarget(history)}</span>
                            </>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>par {formatPerson(history.performer)}</span>
                          <span>·</span>
                          <span>{formatDate(history.createdAt || history.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── dialog ajout ─────────────────────────────────── */}
      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter des cibles au portefeuille</DialogTitle>
            <DialogDescription>Choisissez le commercial et sélectionnez les cibles à intégrer.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Commercial</Label>
                <Select value={assignmentForm.agentId} onValueChange={(v) => setAssignmentForm({ ...assignmentForm, agentId: v, targets: [] })}>
                  <SelectTrigger><SelectValue placeholder="Choisir un commercial" /></SelectTrigger>
                  <SelectContent>
                    {activeAgents.map((agent) => (
                      <SelectItem key={agent.id} value={String(agent.id)}>{agent.firstname} {agent.lastname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Enseigne</Label>
                <Select value={assignmentForm.enseigneId} onValueChange={selectEnseigneTargets}>
                  <SelectTrigger><SelectValue placeholder="Toutes les cibles" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les cibles</SelectItem>
                    {activeEnseignes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Filtrer les cibles..."
                  value={targetPickerSearch}
                  onChange={(e) => setTargetPickerSearch(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label>Cibles disponibles</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{assignmentForm.targets.length} sélectionnée(s)</Badge>
                  {assignmentForm.targets.length > 0 && (
                    <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setAssignmentForm((c) => ({ ...c, targets: [] }))}>
                      Effacer
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border">
                {displayedTargetOptions.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">Aucune cible disponible.</div>
                ) : (
                  displayedTargetOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-3 border-b px-3 py-2.5 last:border-b-0 hover:bg-gray-50"
                    >
                      <Checkbox
                        checked={assignmentForm.targets.includes(option.value)}
                        onCheckedChange={(checked) => toggleTarget(option.value, checked === true)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{option.label}</span>
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        option.type === "location" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {option.type === "location" ? "Local" : "Individuel"}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <Textarea
              placeholder="Note ou consigne pour ce commercial..."
              className="min-h-[70px] resize-none"
              value={assignmentForm.note}
              onChange={(e) => setAssignmentForm({ ...assignmentForm, note: e.target.value })}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignmentDialogOpen(false)}>Annuler</Button>
              <Button
                onClick={submitAssignment}
                disabled={isPending || !assignmentForm.agentId || assignmentForm.targets.length === 0}
              >
                Ajouter {assignmentForm.targets.length > 0 ? `${assignmentForm.targets.length} cible(s)` : ""}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CommercialTransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        agents={initialAgents}
        fromAgentId={selectedAgent}
        portfolioCount={selectedAgentAssignments.length}
        planningCount={planningCountByAgent[selectedAgent] || 0}
        defaultTransferPortfolio
        defaultTransferPlanning={false}
        onSuccess={async (toAgentId) => {
          setSelectedAgent(toAgentId)
          await refresh()
        }}
      />
    </Tabs>
  )
}

/* ─── helpers ─────────────────────────────────────────────────── */

function formatAssignmentTarget(assignment: CommercialAssignment) {
  const location = assignment.commercialClientLocation || assignment.location
  if (location) return `${location.client?.name || assignment.client?.name || "Magasin"} – ${location.name}`
  return assignment.client?.name || "-"
}

function formatPerson(person?: { firstname?: string | null; lastname?: string | null } | null) {
  if (!person) return "-"
  return `${person.firstname || ""} ${person.lastname || ""}`.trim() || "-"
}

function formatHistoryTarget(history: any) {
  if (history.commercialClientLocation?.name) return history.commercialClientLocation.name
  if (history.location?.name) return history.location.name
  if (history.client?.name) return history.client.name
  return "-"
}

function formatAction(action?: string | null) {
  const labels: Record<string, string> = {
    CREATE_ASSIGNMENT: "Ajout",
    DEACTIVATE_ASSIGNMENT: "Retrait",
    TRANSFER_ASSIGNMENT: "Transfert",
    BULK_TRANSFER: "Transfert groupé",
    DEACTIVATE_AGENT: "Agent désactivé",
    DEACTIVATE_CLIENT: "Client désactivé",
    ACTIVATE_CLIENT: "Client activé",
  }
  return action ? labels[action] || action : "-"
}

function actionStyle(action?: string | null) {
  if (action === "CREATE_ASSIGNMENT")   return { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" }
  if (action === "DEACTIVATE_ASSIGNMENT") return { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" }
  if (action === "TRANSFER_ASSIGNMENT") return { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" }
  if (action === "BULK_TRANSFER") return { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" }
  return { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" }
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date)
}

function getInitials(agent: CommercialUser) {
  return `${agent.firstname?.[0] || ""}${agent.lastname?.[0] || ""}`.toUpperCase() || "?"
}

function StatCard({ color, label, value, icon }: { color: "blue" | "violet" | "emerald" | "amber"; label: string; value: number; icon: React.ReactNode }) {
  const styles = {
    blue:    { bg: "bg-blue-50",    icon: "bg-blue-100 text-blue-600",    num: "text-blue-700" },
    violet:  { bg: "bg-violet-50",  icon: "bg-violet-100 text-violet-600", num: "text-violet-700" },
    emerald: { bg: "bg-emerald-50", icon: "bg-emerald-100 text-emerald-600",num: "text-emerald-700" },
    amber:   { bg: "bg-amber-50",   icon: "bg-amber-100 text-amber-600",   num: "text-amber-700" },
  }
  const s = styles[color]
  return (
    <div className={`flex min-h-16 items-center gap-3 rounded-2xl border-0 ${s.bg} px-4 py-3 shadow-sm`}>
      <div className={`rounded-xl p-2 ${s.icon}`}>{icon}</div>
      <div>
        <p className={`text-xl font-bold leading-none ${s.num}`}>{value}</p>
        <p className="mt-1 text-xs leading-none text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
