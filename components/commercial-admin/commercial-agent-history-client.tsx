"use client"

import { Fragment, type FormEvent, useEffect, useMemo, useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getCommercialAgentHistory } from "@/actions/commercial-admin"
import type { CommercialAgentHistoryEntry, CommercialExecutionStatus, CommercialUser } from "@/types/commercial"
import {
  BarChart3,
  ChevronDown,
  Clock3,
  Loader2,
  type LucideIcon,
  RotateCcw,
  Search,
  ShoppingCart,
  Store,
  UserRound,
} from "lucide-react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"

const STATUS_LABELS: Record<CommercialExecutionStatus, string> = {
  APPELE: "Non commandé",
  NON_REPONDU: "Non répondu",
  COMMANDE_PRISE: "Commande prise",
  A_RELANCER: "À relancer",
}

const STATUS_COLORS: Record<CommercialExecutionStatus, string> = {
  APPELE: "bg-emerald-100 text-emerald-800",
  NON_REPONDU: "bg-orange-100 text-orange-800",
  COMMANDE_PRISE: "bg-blue-100 text-blue-800",
  A_RELANCER: "bg-amber-100 text-amber-800",
}

const STAT_STYLES = {
  agent: {
    card: "border-blue-200 bg-blue-50",
    label: "text-blue-700",
    value: "text-blue-950",
    icon: "bg-blue-100 text-blue-700",
  },
  actions: {
    card: "border-slate-200 bg-slate-50",
    label: "text-slate-600",
    value: "text-slate-950",
    icon: "bg-slate-100 text-slate-700",
  },
  orders: {
    card: "border-emerald-200 bg-emerald-50",
    label: "text-emerald-700",
    value: "text-emerald-950",
    icon: "bg-emerald-100 text-emerald-700",
  },
  recalls: {
    card: "border-amber-200 bg-amber-50",
    label: "text-amber-700",
    value: "text-amber-950",
    icon: "bg-amber-100 text-amber-700",
  },
} as const

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

function agentName(agent?: CommercialUser) {
  if (!agent) return "Sélectionner un agent"
  return `${agent.firstname || ""} ${agent.lastname || ""}`.trim() || agent.phone || `Agent #${agent.id}`
}

interface HistoryGroup {
  id: string
  enseigne: string
  entries: CommercialAgentHistoryEntry[]
  latestCreatedAt: string
  commandes: number
  relances: number
}

export default function CommercialAgentHistoryClient({
  agents,
}: {
  agents: CommercialUser[]
}) {
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0] ? String(agents[0].id) : "")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [status, setStatus] = useState("all")
  const [search, setSearch] = useState("")
  const [history, setHistory] = useState<CommercialAgentHistoryEntry[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()

  const selectedAgent = agents.find((agent) => String(agent.id) === selectedAgentId)

  const groupedHistory = useMemo<HistoryGroup[]>(() => {
    const groups = new Map<string, HistoryGroup>()

    for (const entry of history) {
      const enseigne = entry.parentName || "Clients individuels"
      const id = enseigne
      const existing = groups.get(id)

      if (existing) {
        existing.entries.push(entry)
        existing.commandes += entry.status === "COMMANDE_PRISE" ? 1 : 0
        existing.relances += entry.status === "A_RELANCER" ? 1 : 0
        if (new Date(entry.createdAt) > new Date(existing.latestCreatedAt)) {
          existing.latestCreatedAt = entry.createdAt
        }
      } else {
        groups.set(id, {
          id,
          enseigne,
          entries: [entry],
          latestCreatedAt: entry.createdAt,
          commandes: entry.status === "COMMANDE_PRISE" ? 1 : 0,
          relances: entry.status === "A_RELANCER" ? 1 : 0,
        })
      }
    }

    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
    )
  }, [history])

  const columns = useMemo<ColumnDef<HistoryGroup>[]>(
    () => [
      {
        header: "Enseigne",
        accessorKey: "enseigne",
        cell: ({ row }) => (
          <button
            type="button"
            className="group flex items-center gap-3 text-left"
            onClick={() =>
              setExpandedGroups((current) => ({
                ...current,
                [row.original.id]: !current[row.original.id],
              }))
            }
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary/15">
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  expandedGroups[row.original.id] ? "rotate-180" : ""
                }`}
              />
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Store className="h-4 w-4" />
            </span>
            <span>
              <span className="block font-semibold text-gray-900">{row.original.enseigne}</span>
              <span className="text-xs text-muted-foreground">
                Cliquer pour {expandedGroups[row.original.id] ? "replier" : "voir les locaux"}
              </span>
            </span>
          </button>
        ),
      },
      {
        header: "Locaux / actions",
        accessorKey: "entries",
        cell: ({ row }) => (
          <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-700">
            {row.original.entries.length} action{row.original.entries.length > 1 ? "s" : ""}
          </span>
        ),
      },
      {
        header: "Commandes",
        accessorKey: "commandes",
        cell: ({ row }) => (
          <span className="inline-flex min-w-8 justify-center rounded-full bg-blue-50 px-2 py-1 text-sm font-semibold text-blue-700">
            {row.original.commandes}
          </span>
        ),
      },
      {
        header: "Relances",
        accessorKey: "relances",
        cell: ({ row }) => (
          <span className="inline-flex min-w-8 justify-center rounded-full bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-700">
            {row.original.relances}
          </span>
        ),
      },
      {
        header: () => <span className="block text-right">Dernière activité</span>,
        accessorKey: "latestCreatedAt",
        cell: ({ row }) => (
          <span className="block whitespace-nowrap text-right text-sm">
            {formatDate(row.original.latestCreatedAt)}
          </span>
        ),
      },
    ],
    [expandedGroups]
  )

  const table = useReactTable({
    data: groupedHistory,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },
  })

  const loadHistory = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (!selectedAgentId) {
      setHistory([])
      return
    }

    startTransition(async () => {
      const data = await getCommercialAgentHistory({
        agentId: selectedAgentId,
        from: from || undefined,
        to: to || undefined,
        status: status === "all" ? undefined : status,
        search: search || undefined,
      })
      setHistory(data)
      setExpandedGroups({})
      table.setPageIndex(0)
    })
  }

  const resetFilters = () => {
    setFrom("")
    setTo("")
    setStatus("all")
    setSearch("")
    table.setPageIndex(0)
    if (!selectedAgentId) {
      setHistory([])
      return
    }

    startTransition(async () => {
      const data = await getCommercialAgentHistory({ agentId: selectedAgentId })
      setHistory(data)
      setExpandedGroups({})
    })
  }

  useEffect(() => {
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgentId])

  const stats = useMemo(() => {
    return {
      total: history.length,
      commandes: history.filter((entry) => entry.status === "COMMANDE_PRISE").length,
      relances: history.filter((entry) => entry.status === "A_RELANCER").length,
      relancesTraitees: history.filter((entry) => entry.followUpResolved).length,
    }
  }, [history])

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-3 p-3">
        <div className="flex flex-col gap-3 border-b pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/60">Suivi commercial</p>
            <h1 className="text-lg font-bold leading-tight text-slate-950">Historique des tournées</h1>
            <p className="truncate text-xs text-muted-foreground">
              Analysez les actions enregistrées par les agents commerciaux.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:min-w-[560px] lg:grid-cols-4">
            <Stat label="Commercial" value={agentName(selectedAgent)} icon={UserRound} tone="agent" />
            <Stat label="Actions" value={stats.total} icon={BarChart3} tone="actions" />
            <Stat label="Commandes" value={stats.commandes} icon={ShoppingCart} tone="orders" />
            <Stat label="Relances" value={stats.relances} icon={Clock3} tone="recalls" />
          </div>
        </div>

        <form onSubmit={loadHistory} className="grid gap-2 xl:grid-cols-[220px_150px_150px_180px_1fr_auto_auto]">
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={String(agent.id)}>
                  {agentName(agent)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="h-9"
            aria-label="Date début"
          />
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="h-9"
            aria-label="Date fin"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="APPELE">Non commandé</SelectItem>
              <SelectItem value="NON_REPONDU">Non répondu</SelectItem>
              <SelectItem value="COMMANDE_PRISE">Commande prise</SelectItem>
              <SelectItem value="A_RELANCER">À relancer</SelectItem>
              <SelectItem value="RELANCE_EFFECTUEE">Relances effectuées</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-9"
              placeholder="Client, enseigne, téléphone, produit..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={isPending || !selectedAgentId} className="h-9">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Rechercher
          </Button>
          <Button type="button" variant="outline" onClick={resetFilters} disabled={isPending} className="h-9">
            <RotateCcw className="mr-2 h-4 w-4" />
            Réinitialiser
          </Button>
        </form>

        {isPending ? (
          <div className="flex items-center justify-center rounded-xl border py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Chargement de l’historique...
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
            Aucun historique trouvé pour ces critères.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="bg-slate-50">
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} className="h-8 px-3 text-xs">
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
                      <Fragment key={row.id}>
                        <TableRow>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="px-3 py-2 text-xs">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                        {expandedGroups[row.original.id] && (
                          <TableRow key={`${row.id}-details`} className="bg-slate-50/70 hover:bg-slate-50/70">
                            <TableCell colSpan={row.getVisibleCells().length} className="p-0">
                              <div className="p-3">
                                <div className="overflow-x-auto rounded-lg border bg-white">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-slate-50">
                                        <TableHead className="h-8 px-3 text-xs">Date</TableHead>
                                        <TableHead className="h-8 px-3 text-xs">Local / client</TableHead>
                                        <TableHead className="h-8 px-3 text-xs">Statut</TableHead>
                                        <TableHead className="h-8 px-3 text-xs">Commentaire</TableHead>
                                        <TableHead className="h-8 px-3 text-xs">Produits commandés</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {row.original.entries.map((entry) => (
                                        <TableRow key={entry.id}>
                                          <TableCell className="whitespace-nowrap px-3 py-2 text-xs">
                                            {formatDate(entry.createdAt)}
                                          </TableCell>
                                          <TableCell className="px-3 py-2 text-xs">
                                            <div className="font-medium text-slate-900">{entry.clientName}</div>
                                            <div className="text-muted-foreground">
                                              {entry.clientPhone || entry.clientCode || "Sans contact"}
                                            </div>
                                          </TableCell>
                                          <TableCell className="px-3 py-2">
                                            <div className="flex flex-wrap gap-1">
                                              <Badge className={STATUS_COLORS[entry.status]}>{STATUS_LABELS[entry.status]}</Badge>
                                              {entry.followUpResolved && (
                                                <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100">
                                                  Relance traitée
                                                </Badge>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell className="max-w-[320px] px-3 py-2 text-xs text-muted-foreground">
                                            <span className="line-clamp-2">{entry.comment || "—"}</span>
                                          </TableCell>
                                          <TableCell className="px-3 py-2">
                                            {entry.orderLines.length > 0 ? (
                                              <div className="flex flex-wrap gap-1">
                                                {entry.orderLines.map((line) => (
                                                  <Badge key={line.id} variant="secondary" className="font-normal">
                                                    {line.productName || "Produit"} × {line.quantity}
                                                  </Badge>
                                                ))}
                                              </div>
                                            ) : (
                                              <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()} · {groupedHistory.length} enseigne{groupedHistory.length > 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  tone: keyof typeof STAT_STYLES
}) {
  const styles = STAT_STYLES[tone]

  return (
    <div className={`flex items-center justify-between rounded-xl border px-3 py-2 ${styles.card}`}>
      <div className="min-w-0">
        <div className={`truncate text-[11px] ${styles.label}`}>{label}</div>
        <div className={`truncate text-lg font-bold leading-none ${styles.value}`}>{value}</div>
      </div>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
  )
}
