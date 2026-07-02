"use client"

import { useEffect, useMemo, useState, useRef, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Bell, Loader2, Search, Filter, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  AgentClient,
  AgentStats,
  getAgentDailyData,
  getAgentFollowUps,
} from "@/actions/agent-actions"
import { ClientSheetDialog } from "@/components/agent-component/client-agent-dialog"
import {
  COMMERCIAL_DAYS,
  EXECUTION_STATUS_COLORS,
  EXECUTION_STATUS_LABELS,
  getTodayCommercialDay,
} from "@/lib/agent-utils"
import type { CommercialExecutionStatus } from "@/actions/agent-actions"
import { activePageRefetchOptions, queryKeys } from "@/lib/query-keys"

function statusLabel(status: CommercialExecutionStatus | null) {
  if (!status) return "Aucune action"
  return EXECUTION_STATUS_LABELS[status]
}

function statusClass(status: CommercialExecutionStatus | null) {
  if (!status) return "bg-gray-50 text-gray-600"
  return EXECUTION_STATUS_COLORS[status]
}

function treatmentLabel(status: AgentClient["status"]) {
  return status === "effectuer" ? "Traité" : "En attente de traitement"
}

function treatmentClass(status: AgentClient["status"]) {
  return status === "effectuer"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-amber-50 text-amber-700"
}

function followUpDateLabel(nextFollowUpAt: string | null) {
  if (!nextFollowUpAt) return null
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(nextFollowUpAt))
}

export default function AgentClientComponent() {
  const searchParams = useSearchParams()
  const followUpsSectionRef = useRef<HTMLElement | null>(null)
  const [selectedDay, setSelectedDay] = useState(getTodayCommercialDay)
  const [searchTerm, setSearchTerm] = useState("")
  const [treatmentFilter, setTreatmentFilter] = useState<string>("en_attente")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedClient, setSelectedClient] = useState<AgentClient | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const {
    data: dailyData,
    isLoading: loading,
    error: dailyError,
  } = useQuery({
    queryKey: queryKeys.agentClients(selectedDay),
    queryFn: () => getAgentDailyData(selectedDay),
    ...activePageRefetchOptions,
  })

  const { data: followUps = [], isLoading: followUpsLoading } = useQuery<AgentClient[]>({
    queryKey: queryKeys.agentFollowUps(),
    queryFn: () => getAgentFollowUps(),
    ...activePageRefetchOptions,
  })

  const clients = dailyData?.clients || []
  const stats: AgentStats = dailyData?.stats || {
    totalClients: 0,
    completedClients: 0,
    pendingClients: 0,
    progress: { current: 0, total: 0 },
  }

  useEffect(() => {
    if (dailyError) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le programme du jour",
        variant: "destructive",
      })
    }
  }, [dailyError, toast])

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.address || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.phone || "").includes(searchTerm) ||
      (client.accountNumber || "").includes(searchTerm) ||
      (client.parentName || "").toLowerCase().includes(searchTerm.toLowerCase())

    const matchesTreatment =
      treatmentFilter === "all" || client.status === treatmentFilter

    const matchesStatus =
      statusFilter === "all" || client.executionStatus === statusFilter

    return matchesSearch && matchesTreatment && matchesStatus
  })

  const handleClientClick = (client: AgentClient) => {
    setSelectedClient(client)
    setIsDialogOpen(true)
  }

  const dayLabel = selectedDay.charAt(0) + selectedDay.slice(1).toLowerCase()
  const isTodaySelected = selectedDay === getTodayCommercialDay()

  const dailyClientIds = useMemo(() => new Set(clients.map((client) => client.id)), [clients])

  const followUpsDueToday = useMemo(
    () => followUps.filter((client) => client.followUpDueState === "due_today"),
    [followUps]
  )

  const followUpsOverdue = useMemo(
    () => followUps.filter((client) => client.followUpDueState === "overdue"),
    [followUps]
  )

  const followUpIds = useMemo(() => new Set(followUps.map((client) => client.id)), [followUps])

  const prioritizedFollowUps = useMemo(() => {
    return [...followUps].sort((a, b) => {
      if (a.followUpDueState === "overdue" && b.followUpDueState !== "overdue") return -1
      if (b.followUpDueState === "overdue" && a.followUpDueState !== "overdue") return 1
      return new Date(a.nextFollowUpAt || 0).getTime() - new Date(b.nextFollowUpAt || 0).getTime()
    })
  }, [followUps])

  const sortedFilteredClients = useMemo(() => {
    return [...filteredClients].sort((a, b) => {
      const aPriority = followUpIds.has(a.id) ? 0 : 1
      const bPriority = followUpIds.has(b.id) ? 0 : 1
      if (aPriority !== bPriority) return aPriority - bPriority
      return 0
    })
  }, [filteredClients, followUpIds])

  const hasFollowUpPriority = isTodaySelected && prioritizedFollowUps.length > 0

  const scrollToFollowUps = useCallback(() => {
    setSelectedDay(getTodayCommercialDay())
    window.setTimeout(() => {
      followUpsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 120)
  }, [])

  useEffect(() => {
    if (searchParams.get("relances") !== "1") return
    if (followUpsLoading) return

    setSelectedDay(getTodayCommercialDay())

    if (prioritizedFollowUps.length === 0) {
      toast({
        title: "Aucune relance en attente",
        description: "Vous n'avez pas de client à relancer pour le moment.",
      })
      return
    }

    scrollToFollowUps()
  }, [searchParams, followUpsLoading, prioritizedFollowUps.length, scrollToFollowUps, toast])

  useEffect(() => {
    const onShowRelances = () => {
      if (followUpsLoading) return

      setSelectedDay(getTodayCommercialDay())

      if (prioritizedFollowUps.length === 0) {
        toast({
          title: "Aucune relance en attente",
          description: "Vous n'avez pas de client à relancer pour le moment.",
        })
        return
      }

      scrollToFollowUps()
    }

    window.addEventListener("agent-show-relances", onShowRelances)
    return () => window.removeEventListener("agent-show-relances", onShowRelances)
  }, [followUpsLoading, prioritizedFollowUps.length, scrollToFollowUps, toast])

  return (
    <div className="w-full space-y-3 px-3 py-3 sm:px-4">
      {hasFollowUpPriority && (
        <section
          ref={followUpsSectionRef}
          id="relances-priorite"
          className={
            followUpsOverdue.length > 0
              ? "overflow-hidden rounded-xl border-2 border-red-400 bg-red-50 shadow-md"
              : "overflow-hidden rounded-xl border-2 border-amber-400 bg-amber-50 shadow-md"
          }
        >
          <div
            className={
              followUpsOverdue.length > 0
                ? "border-b border-red-200 bg-red-100 px-3 py-3"
                : "border-b border-amber-200 bg-amber-100 px-3 py-3"
            }
          >
            <div className="flex items-start gap-2">
              {followUpsOverdue.length > 0 ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
              ) : (
                <Bell className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    className={
                      followUpsOverdue.length > 0
                        ? "text-sm font-bold text-red-950 sm:text-base"
                        : "text-sm font-bold text-amber-950 sm:text-base"
                    }
                  >
                    Priorité — Clients à relancer
                  </h2>
                  <span
                    className={
                      followUpsOverdue.length > 0
                        ? "inline-flex animate-pulse rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold text-white"
                        : "inline-flex rounded-full bg-amber-600 px-2.5 py-0.5 text-[11px] font-bold text-white"
                    }
                  >
                    {prioritizedFollowUps.length}
                  </span>
                </div>
                <p
                  className={
                    followUpsOverdue.length > 0 ? "mt-1 text-xs text-red-800" : "mt-1 text-xs text-amber-800"
                  }
                >
                  {followUpsOverdue.length > 0
                    ? `${followUpsOverdue.length} en retard${followUpsDueToday.length > 0 ? ` · ${followUpsDueToday.length} prévue${followUpsDueToday.length > 1 ? "s" : ""} aujourd'hui` : ""} — traitez ces clients en premier`
                    : "Relances à traiter aujourd'hui avant la tournée"}
                </p>
              </div>
            </div>
          </div>

          <div className={followUpsOverdue.length > 0 ? "divide-y divide-red-200" : "divide-y divide-amber-200"}>
            {prioritizedFollowUps.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => handleClientClick(client)}
                className={
                  client.followUpDueState === "overdue"
                    ? "flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-red-100/70"
                    : "flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-amber-100/70"
                }
              >
                <div className="min-w-0">
                  {client.parentName && (
                    <p
                      className={
                        client.followUpDueState === "overdue"
                          ? "truncate text-[11px] font-medium text-red-700/80"
                          : "truncate text-[11px] font-medium text-amber-800/80"
                      }
                    >
                      {client.parentName}
                    </p>
                  )}
                  <p
                    className={
                      client.followUpDueState === "overdue"
                        ? "truncate text-sm font-semibold text-red-950"
                        : "truncate text-sm font-semibold text-amber-950"
                    }
                  >
                    {client.name}
                  </p>
                  <p
                    className={
                      client.followUpDueState === "overdue" ? "mt-0.5 text-xs text-red-800" : "mt-0.5 text-xs text-amber-800"
                    }
                  >
                    {client.followUpDueState === "overdue" ? "En retard" : "À relancer aujourd'hui"}
                    {followUpDateLabel(client.nextFollowUpAt) ? ` · ${followUpDateLabel(client.nextFollowUpAt)}` : ""}
                    {!dailyClientIds.has(client.id) ? " · Hors fiche du jour" : " · Dans la fiche du jour"}
                  </p>
                </div>
                <span
                  className={
                    client.followUpDueState === "overdue"
                      ? "shrink-0 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white"
                      : "shrink-0 rounded-full bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white"
                  }
                >
                  {client.followUpDueState === "overdue" ? "Retard" : "Relance"}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Barre outils compacte */}
      <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm sm:flex sm:items-center sm:gap-3 sm:bg-gray-50 sm:py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-900">Tournée — {dayLabel}</span>
            <span className="text-xs text-gray-500 sm:text-sm">Semaine en cours</span>
            <span className="hidden text-gray-400 sm:inline">|</span>
            <span className="text-sm text-gray-600 sm:text-base">
              <strong>{stats.completedClients}</strong>/{stats.totalClients} terminés
            </span>
            <span className="hidden text-gray-400 sm:inline">|</span>
            <span className="text-sm text-gray-600 sm:text-base">{stats.pendingClients} en attente</span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 sm:ml-auto sm:mt-0">
          <Select value={selectedDay} onValueChange={setSelectedDay}>
            <SelectTrigger className="h-10 w-full border-gray-300 bg-white text-sm sm:h-9 sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMERCIAL_DAYS.map((day) => (
                <SelectItem key={day} value={day}>
                  {day.charAt(0) + day.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 border-gray-300 pl-9 text-base sm:h-9"
          />
        </div>
        <Select value={treatmentFilter} onValueChange={setTreatmentFilter}>
          <SelectTrigger className="h-10 w-full border-gray-300 text-base sm:h-9 sm:w-48">
            <Filter className="mr-1.5 h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les états</SelectItem>
            <SelectItem value="en_attente">En attente de traitement</SelectItem>
            <SelectItem value="effectuer">Traités</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-full border-gray-300 text-base sm:h-9 sm:w-48">
            <Filter className="mr-1.5 h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="APPELE">Non commandé</SelectItem>
            <SelectItem value="NON_REPONDU">Non répondu</SelectItem>
            <SelectItem value="COMMANDE_PRISE">Commande prise</SelectItem>
            <SelectItem value="A_RELANCER">À relancer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Vue mobile simplifiée */}
      <div className="space-y-1.5 md:hidden">
        {loading ? (
          <div className="flex items-center justify-center rounded-xl border bg-white py-10 text-sm text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Chargement...
          </div>
        ) : sortedFilteredClients.length === 0 ? (
          <div className="rounded-xl border bg-white py-10 text-center text-sm text-gray-500">
            {searchTerm || treatmentFilter !== "all" || statusFilter !== "all"
              ? "Aucun client trouvé"
              : `Aucun client planifié pour ${dayLabel}`}
          </div>
        ) : (
          sortedFilteredClients.map((client) => (
            <button
              key={client.id}
              type="button"
              className={`w-full rounded-lg border p-2.5 text-left shadow-sm transition ${
                followUpIds.has(client.id)
                  ? "border-red-300 bg-red-50/80 hover:border-red-400 hover:bg-red-100/60"
                  : "bg-white hover:border-primary/30 hover:bg-primary-50/30"
              }`}
              onClick={() => handleClientClick(client)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {client.parentName && (
                    <p className="truncate text-[11px] font-medium text-muted-foreground">{client.parentName}</p>
                  )}
                  <p className="truncate text-sm font-semibold text-gray-950">{client.name}</p>
                </div>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                {followUpIds.has(client.id) && (
                  <span className="inline-block rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                    Relance
                  </span>
                )}
                <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${treatmentClass(client.status)}`}>
                  {treatmentLabel(client.status)}
                </span>
                <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${statusClass(client.executionStatus)}`}>
                  {statusLabel(client.executionStatus)}
                </span>
              </div>

              {(client.address || client.phone) && (
                <div className="mt-1.5 space-y-0.5 text-xs text-gray-600">
                  {client.address && <p className="line-clamp-1">{client.address}</p>}
                  {client.phone && (
                    <p className="font-medium text-gray-700">{client.phone}</p>
                  )}
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Tableau complet desktop */}
      <div className="hidden overflow-x-auto border border-gray-300 bg-white md:block">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Chargement...
          </div>
        ) : sortedFilteredClients.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            {searchTerm || treatmentFilter !== "all" || statusFilter !== "all"
              ? "Aucun client trouvé"
              : `Aucun client planifié pour ${dayLabel}`}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100 hover:bg-gray-100">
                <TableHead className="h-10 w-12 border-r border-gray-300 px-3 text-sm font-bold text-gray-700">#</TableHead>
                <TableHead className="h-10 border-r border-gray-300 px-3 text-sm font-bold text-gray-700">Enseigne</TableHead>
                <TableHead className="h-10 border-r border-gray-300 px-3 text-sm font-bold text-gray-700">Client / Local</TableHead>
                <TableHead className="h-10 border-r border-gray-300 px-3 text-sm font-bold text-gray-700">Adresse</TableHead>
                <TableHead className="h-10 border-r border-gray-300 px-3 text-sm font-bold text-gray-700">Téléphone</TableHead>
                <TableHead className="h-10 border-r border-gray-300 px-3 text-sm font-bold text-gray-700">État</TableHead>
                <TableHead className="h-10 px-3 text-sm font-bold text-gray-700">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFilteredClients.map((client, index) => (
                <TableRow
                  key={client.id}
                  className={`cursor-pointer text-sm hover:bg-blue-50 ${
                    followUpIds.has(client.id)
                      ? "bg-red-50/80 hover:bg-red-100/60"
                      : index % 2 === 0
                        ? "bg-white"
                        : "bg-gray-50/60"
                  }`}
                  onClick={() => handleClientClick(client)}
                >
                  <TableCell className="border-r border-gray-200 px-3 py-2.5 text-center text-gray-500">
                    {index + 1}
                  </TableCell>
                  <TableCell className="border-r border-gray-200 px-3 py-2.5 font-medium text-gray-800">
                    {client.parentName || "—"}
                  </TableCell>
                  <TableCell className="border-r border-gray-200 px-3 py-2.5 font-medium text-gray-900">
                    {client.name}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate border-r border-gray-200 px-3 py-2.5 text-gray-700">
                    {client.address || "—"}
                  </TableCell>
                  <TableCell className="border-r border-gray-200 px-3 py-2.5 whitespace-nowrap text-gray-700">
                    {client.phone || "—"}
                  </TableCell>
                  <TableCell className="border-r border-gray-200 px-3 py-2.5">
                    <span className={`inline-block rounded px-2 py-0.5 text-sm font-medium ${treatmentClass(client.status)}`}>
                      {treatmentLabel(client.status)}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {followUpIds.has(client.id) && (
                        <span className="inline-block rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                          Relance
                        </span>
                      )}
                      <span className={`inline-block rounded px-2 py-0.5 text-sm font-medium ${statusClass(client.executionStatus)}`}>
                        {statusLabel(client.executionStatus)}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="hidden text-right text-sm text-gray-400 md:block">
        {sortedFilteredClients.length} ligne{sortedFilteredClients.length > 1 ? "s" : ""} affichée
        {sortedFilteredClients.length > 1 ? "s" : ""}
      </p>

      {selectedClient && (
        <ClientSheetDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          client={selectedClient}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["agent-clients"] })
            queryClient.invalidateQueries({ queryKey: queryKeys.agentFollowUps() })
            queryClient.invalidateQueries({ queryKey: ["commercial-orders"] })
            queryClient.invalidateQueries({ queryKey: ["notifications"] })
          }}
        />
      )}
    </div>
  )
}
