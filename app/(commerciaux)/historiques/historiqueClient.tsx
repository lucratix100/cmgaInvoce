"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  AlertCircle,
  CalendarIcon,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Filter,
  Loader2,
  MessageSquare,
  Phone,
  Search,
  ShoppingCart,
  TrendingUp,
  User,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  exportHistorique,
  getHistoriqueData,
  getHistoriqueStats,
  HistoriqueEntry,
  HistoriqueFilters,
  HistoriqueStats,
} from "@/actions/historique-actions"

type ActionKey = "APPELE" | "NON_REPONDU" | "COMMANDE_PRISE" | "A_RELANCER"

const ACTION_META: Record<ActionKey, {
  label: string
  icon: typeof Phone
  badgeClass: string
  softClass: string
}> = {
  APPELE: {
    label: "Non commandé",
    icon: CheckCircle,
    badgeClass: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    softClass: "bg-emerald-50 text-emerald-700",
  },
  NON_REPONDU: {
    label: "Non répondu",
    icon: X,
    badgeClass: "bg-orange-100 text-orange-700 hover:bg-orange-100",
    softClass: "bg-orange-50 text-orange-700",
  },
  COMMANDE_PRISE: {
    label: "Commande prise",
    icon: ShoppingCart,
    badgeClass: "bg-blue-100 text-blue-700 hover:bg-blue-100",
    softClass: "bg-blue-50 text-blue-700",
  },
  A_RELANCER: {
    label: "À relancer",
    icon: Clock,
    badgeClass: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    softClass: "bg-amber-50 text-amber-700",
  },
}

function getActionMeta(action: string) {
  return ACTION_META[action as ActionKey] || {
    label: action,
    icon: Phone,
    badgeClass: "bg-slate-100 text-slate-700 hover:bg-slate-100",
    softClass: "bg-slate-50 text-slate-700",
  }
}

function formatDisplayDate(date: Date | undefined) {
  return date ? format(date, "dd/MM/yyyy", { locale: fr }) : null
}

function parseDateParam(value?: string) {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

export default function HistoriqueClientComponent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryString = searchParams.toString()
  const filters = useMemo<HistoriqueFilters>(() => {
    const params = new URLSearchParams(queryString)
    return {
      dateFrom: params.get("dateFrom") || undefined,
      dateTo: params.get("dateTo") || undefined,
      action: params.get("action") || undefined,
      client: params.get("client") || undefined,
    }
  }, [queryString])

  const [historiqueData, setHistoriqueData] = useState<HistoriqueEntry[]>([])
  const [stats, setStats] = useState<HistoriqueStats>({
    total: 0,
    totalProducts: 0,
    clientsTouched: 0,
    responseRate: 0,
    followUpsResolved: 0,
    byAction: { APPELE: 0, NON_REPONDU: 0, COMMANDE_PRISE: 0, A_RELANCER: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<HistoriqueEntry | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState(filters.client || "")
  const [dateFrom, setDateFrom] = useState<Date | undefined>(parseDateParam(filters.dateFrom))
  const [dateTo, setDateTo] = useState<Date | undefined>(parseDateParam(filters.dateTo))
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [filters])

  useEffect(() => {
    setSearchTerm(filters.client || "")
    setDateFrom(parseDateParam(filters.dateFrom))
    setDateTo(parseDateParam(filters.dateTo))
  }, [filters.client, filters.dateFrom, filters.dateTo])

  const loadData = async () => {
    setLoading(true)
    try {
      const [data, statsData] = await Promise.all([
        getHistoriqueData(filters),
        getHistoriqueStats(filters),
      ])
      setHistoriqueData(data)
      setStats(statsData)
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const periodLabel = useMemo(() => {
    const from = formatDisplayDate(parseDateParam(filters.dateFrom))
    const to = formatDisplayDate(parseDateParam(filters.dateTo))
    if (from && to) return `${from} au ${to}`
    if (from) return `Depuis le ${from}`
    if (to) return `Jusqu'au ${to}`
    return "Toutes les dates"
  }, [filters.dateFrom, filters.dateTo])

  const monthlyTrendMessage = useMemo(() => {
    const trend = stats.monthlyTrend
    if (!trend) {
      return {
        title: "Évolution mensuelle indisponible",
        message: "Les données du mois seront affichées dès que l'historique sera disponible.",
        className: "border-slate-200 bg-slate-50 text-slate-700",
      }
    }

    if (trend.direction === "up") {
      return {
        title: `Activité en hausse de ${trend.percent}% ce mois`,
        message: `${trend.currentMonth} actions ce mois contre ${trend.previousMonth} le mois passé. Gardez le rythme et priorisez les relances qui peuvent devenir des commandes.`,
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      }
    }

    if (trend.direction === "down") {
      return {
        title: `Activité en baisse de ${Math.abs(trend.percent)}% ce mois`,
        message: `${trend.currentMonth} actions ce mois contre ${trend.previousMonth} le mois passé. Pensez à relancer les clients non répondus et les rappels en attente.`,
        className: "border-orange-200 bg-orange-50 text-orange-800",
      }
    }

    return {
      title: "Activité stable ce mois",
      message: `${trend.currentMonth} actions ce mois, comme le mois passé. Surveillez les relances pour créer plus de commandes.`,
      className: "border-blue-200 bg-blue-50 text-blue-800",
    }
  }, [stats.monthlyTrend])

  const updateUrlFilters = (nextFilters: HistoriqueFilters) => {
    const params = new URLSearchParams()
    if (nextFilters.dateFrom) params.set("dateFrom", nextFilters.dateFrom)
    if (nextFilters.dateTo) params.set("dateTo", nextFilters.dateTo)
    if (nextFilters.action) params.set("action", nextFilters.action)
    if (nextFilters.client) params.set("client", nextFilters.client)

    const url = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(url, { scroll: false })
  }

  const handleFilterChange = (key: keyof HistoriqueFilters, value: string) => {
    updateUrlFilters({
      ...filters,
      [key]: value || undefined,
    })
  }

  const handleSearch = () => {
    const newFilters: HistoriqueFilters = { ...filters }

    if (searchTerm) newFilters.client = searchTerm
    else delete newFilters.client

    if (dateFrom) newFilters.dateFrom = format(dateFrom, "yyyy-MM-dd")
    else delete newFilters.dateFrom

    if (dateTo) newFilters.dateTo = format(dateTo, "yyyy-MM-dd")
    else delete newFilters.dateTo

    updateUrlFilters(newFilters)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setDateFrom(undefined)
    setDateTo(undefined)
    updateUrlFilters({})
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportHistorique(filters)
      toast({
        title: "Export réussi",
        description: "L'historique des appels a été exporté avec succès",
      })
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter l'historique",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  const showEntryDetails = (entry: HistoriqueEntry) => {
    setSelectedEntry(entry)
    setIsDetailDialogOpen(true)
  }

  const columns = useMemo<ColumnDef<HistoriqueEntry>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Date / heure",
        cell: ({ row }) => (
          <div className="text-xs">
            <div className="font-medium text-slate-900">
              {format(new Date(row.original.date), "dd/MM/yyyy", { locale: fr })}
            </div>
            <div className="text-muted-foreground">{row.original.time}</div>
          </div>
        ),
      },
      {
        accessorKey: "clientName",
        header: "Client",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">{row.original.clientName}</div>
              <div className="text-xs text-muted-foreground">{row.original.parentName || "Sans enseigne"}</div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => {
          const meta = getActionMeta(row.original.action)
          const Icon = meta.icon
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className={`${meta.badgeClass} text-xs`}>
                <Icon className="mr-1 h-3.5 w-3.5" />
                {meta.label}
              </Badge>
              {row.original.followUpResolved && (
                <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 text-xs">
                  Relance traitée
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        id: "products",
        header: "Produits",
        cell: ({ row }) => {
          const count = row.original.details.products?.length || 0
          return (
            <span className="text-sm text-muted-foreground">
              {count > 0 ? `${count} produit${count > 1 ? "s" : ""}` : "—"}
            </span>
          )
        },
      },
      {
        id: "comment",
        header: "Note",
        cell: ({ row }) => (
          <span className="line-clamp-1 max-w-xs text-sm text-slate-600">
            {row.original.details.comment || "—"}
          </span>
        ),
      },
      {
        id: "details",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => showEntryDetails(row.original)}
            className="h-8 rounded-full"
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Voir
          </Button>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: historiqueData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50/70 px-3 py-3 md:px-4">
      <div className="mx-auto max-w-7xl space-y-3">
        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b bg-gradient-to-r from-primary/10 via-white to-white p-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary/60">
                  Suivi commercial
                </p>
                <h1 className="mt-0.5 text-xl font-bold text-slate-950 md:text-2xl">Historique des actions</h1>
                <p className="mt-1 hidden max-w-2xl text-sm text-muted-foreground md:block">
                  Consultez vos appels, relances et commandes avec des statistiques recalculées selon la période choisie.
                </p>
              </div>
              <div className="rounded-xl border bg-white px-3 py-2 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Période affichée</div>
                <div className="mt-1 flex items-center gap-2 font-semibold text-slate-900">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  {periodLabel}
                </div>
              </div>
            </div>
          </div>

          <details className="border-b md:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-sm font-semibold text-slate-900">
              <span>Résumé et statistiques</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{stats.total} actions</span>
            </summary>
            <div className="grid gap-2 px-3 pb-3">
              <StatCard label="Actions" value={stats.total} icon={Phone} helper="sur la période" />
              <StatCard label="Clients touchés" value={stats.clientsTouched} icon={User} helper="clients uniques" />
              <StatCard label="Commandes" value={stats.byAction.COMMANDE_PRISE} icon={ShoppingCart} helper={`${stats.totalProducts} articles`} />
              <StatCard label="Relances" value={stats.byAction.A_RELANCER} icon={Clock} helper="planifiées" />
              <StatCard label="Relances traitées" value={stats.followUpsResolved || 0} icon={CheckCircle} helper="effectuées sur la période" />
              <StatCard label="Taux réponse" value={`${stats.responseRate}%`} icon={TrendingUp} helper="appelés + commandes" />
              <div className={`rounded-xl border p-2.5 ${monthlyTrendMessage.className}`}>
                <div className="flex items-start gap-2">
                  <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold">{monthlyTrendMessage.title}</div>
                    <p className="mt-0.5 text-xs opacity-90">{monthlyTrendMessage.message}</p>
                  </div>
                </div>
              </div>
            </div>
          </details>

          <div className="hidden gap-2 p-3 md:grid sm:grid-cols-2 xl:grid-cols-6">
            <StatCard label="Actions" value={stats.total} icon={Phone} helper="sur la période" />
            <StatCard label="Clients touchés" value={stats.clientsTouched} icon={User} helper="clients uniques" />
            <StatCard label="Commandes" value={stats.byAction.COMMANDE_PRISE} icon={ShoppingCart} helper={`${stats.totalProducts} articles`} />
            <StatCard label="Relances" value={stats.byAction.A_RELANCER} icon={Clock} helper="planifiées" />
            <StatCard label="Relances traitées" value={stats.followUpsResolved || 0} icon={CheckCircle} helper="effectuées" />
            <StatCard label="Taux réponse" value={`${stats.responseRate}%`} icon={TrendingUp} helper="appelés + commandes" />
          </div>
          <div className="hidden px-3 pb-3 md:block">
            <div className={`rounded-xl border p-2.5 ${monthlyTrendMessage.className}`}>
              <div className="flex items-start gap-2">
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="text-sm font-semibold">{monthlyTrendMessage.title}</div>
                  <p className="mt-0.5 text-xs opacity-90">{monthlyTrendMessage.message}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-[1.7fr_1fr]">
          <details className="rounded-2xl border bg-white shadow-sm md:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-base font-semibold text-slate-950">
              <span>Filtres et recherche</span>
              <Filter className="h-4 w-4 text-primary" />
            </summary>
            <div className="space-y-3 px-3 pb-3">
              <div className="grid grid-cols-1 gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Rechercher un client..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 rounded-xl border-slate-200 bg-slate-50 pl-10"
                  />
                </div>
                <DateFilterButton date={dateFrom} onSelect={setDateFrom} placeholder="Date de début" />
                <DateFilterButton date={dateTo} onSelect={setDateTo} placeholder="Date de fin" />
                <Select value={filters.action || "all"} onValueChange={(value) => handleFilterChange("action", value === "all" ? "" : value)}>
                  <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-slate-50">
                    <SelectValue placeholder="Toutes les actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les actions</SelectItem>
                    <SelectItem value="APPELE">Non commandé</SelectItem>
                    <SelectItem value="NON_REPONDU">Non répondu</SelectItem>
                    <SelectItem value="COMMANDE_PRISE">Commande prise</SelectItem>
                    <SelectItem value="A_RELANCER">À relancer</SelectItem>
                    <SelectItem value="RELANCE_EFFECTUEE">Relances effectuées</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Button onClick={handleSearch} className="h-9 rounded-xl">
                  <Search className="mr-2 h-4 w-4" />
                  Appliquer
                </Button>
                <Button variant="outline" onClick={clearFilters} className="h-9 rounded-xl">
                  Effacer
                </Button>
                <Button variant="outline" onClick={handleExport} disabled={exporting} className="h-9 rounded-xl">
                  {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Exporter
                </Button>
              </div>
            </div>
          </details>

          <Card className="hidden border-none shadow-sm md:block">
            <CardContent className="space-y-3 p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Filter className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-950">Filtres et recherche</h2>
                  <p className="hidden text-xs text-muted-foreground md:block">Choisissez une date ou une période pour voir vos statistiques.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Rechercher un client..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 rounded-xl border-slate-200 bg-slate-50 pl-10"
                  />
                </div>

                <DateFilterButton date={dateFrom} onSelect={setDateFrom} placeholder="Date de début" />
                <DateFilterButton date={dateTo} onSelect={setDateTo} placeholder="Date de fin" />

                <Select value={filters.action || "all"} onValueChange={(value) => handleFilterChange("action", value === "all" ? "" : value)}>
                  <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-slate-50">
                    <SelectValue placeholder="Toutes les actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les actions</SelectItem>
                    <SelectItem value="APPELE">Non commandé</SelectItem>
                    <SelectItem value="NON_REPONDU">Non répondu</SelectItem>
                    <SelectItem value="COMMANDE_PRISE">Commande prise</SelectItem>
                    <SelectItem value="A_RELANCER">À relancer</SelectItem>
                    <SelectItem value="RELANCE_EFFECTUEE">Relances effectuées</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button onClick={handleSearch} className="h-9 rounded-xl sm:min-w-36">
                  <Search className="mr-2 h-4 w-4" />
                  Appliquer
                </Button>
                <Button variant="outline" onClick={clearFilters} className="h-9 rounded-xl">
                  Effacer
                </Button>
                <Button variant="outline" onClick={handleExport} disabled={exporting} className="h-9 rounded-xl">
                  {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Exporter
                </Button>
              </div>
            </CardContent>
          </Card>

          <details className="rounded-2xl border bg-white shadow-sm lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-base font-semibold text-slate-950">
              <span>Répartition des actions</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </summary>
            <div className="space-y-2 px-3 pb-3">
              {(Object.keys(ACTION_META) as ActionKey[]).map((action) => {
                const meta = ACTION_META[action]
                const Icon = meta.icon
                const count = stats.byAction[action]
                const percent = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                return (
                  <div key={action} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium text-slate-700">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${meta.softClass}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        {meta.label}
                      </span>
                      <span className="font-semibold">{count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </details>

          <Card className="hidden border-none shadow-sm lg:block">
            <CardContent className="space-y-2 p-3">
              <h2 className="font-semibold text-slate-950">Répartition des actions</h2>
              {(Object.keys(ACTION_META) as ActionKey[]).map((action) => {
                const meta = ACTION_META[action]
                const Icon = meta.icon
                const count = stats.byAction[action]
                const percent = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                return (
                  <div key={action} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium text-slate-700">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${meta.softClass}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        {meta.label}
                      </span>
                      <span className="font-semibold">{count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </section>

        <Card className="border-none shadow-sm">
          <CardContent className="p-3">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Actions enregistrées</h2>
                <p className="text-sm text-muted-foreground">
                  {stats.total} résultat{stats.total > 1 ? "s" : ""} pour {periodLabel.toLowerCase()}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center rounded-2xl border border-dashed py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-gray-600">Chargement de l'historique...</span>
              </div>
            ) : historiqueData.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
                <AlertCircle className="mb-3 h-10 w-10 text-muted-foreground" />
                <h3 className="font-semibold text-slate-900">Aucune action trouvée</h3>
                <p className="mt-1 text-sm text-muted-foreground">Changez la date ou élargissez la recherche.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 md:hidden">
                  {table.getRowModel().rows.map((row) => {
                    const entry = row.original
                    const meta = getActionMeta(entry.action)
                    const Icon = meta.icon
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => showEntryDetails(entry)}
                        className="w-full rounded-xl border bg-white p-3 text-left shadow-sm transition hover:border-primary/30 hover:bg-primary-50/30"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">{entry.clientName}</p>
                            <p className="truncate text-xs text-muted-foreground">{entry.parentName || "Sans enseigne"}</p>
                          </div>
                          <Badge className={`${meta.badgeClass} shrink-0 text-[11px]`}>
                            <Icon className="mr-1 h-3 w-3" />
                            {meta.label}
                          </Badge>
                          {entry.followUpResolved && (
                            <Badge className="shrink-0 bg-violet-100 text-[11px] text-violet-700 hover:bg-violet-100">
                              Relance traitée
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{format(new Date(entry.date), "dd/MM/yyyy", { locale: fr })}</span>
                          <span>{entry.time}</span>
                          {(entry.details.products?.length || 0) > 0 && (
                            <span>{entry.details.products?.length} produit{(entry.details.products?.length || 0) > 1 ? "s" : ""}</span>
                          )}
                        </div>
                        {entry.details.comment && (
                          <p className="mt-1 line-clamp-1 text-xs text-slate-600">{entry.details.comment}</p>
                        )}
                      </button>
                    )
                  })}
                </div>

                <div className="hidden overflow-hidden rounded-2xl border md:block">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id} className="hover:bg-slate-50">
                            {headerGroup.headers.map((header) => (
                              <TableHead key={header.id}>
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
                          <TableRow key={row.id} className="hover:bg-primary/5">
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                  <div>
                    Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()} - 10 lignes par page
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="rounded-full"
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="rounded-full"
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none overflow-y-auto rounded-none p-3 sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-lg sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Phone className="h-5 w-5 text-primary" />
                Détail de l'action
              </DialogTitle>
            </DialogHeader>

            {selectedEntry && (
              <div className="space-y-3 sm:space-y-5">
                <div className="rounded-xl border bg-slate-50 p-3 sm:rounded-2xl sm:p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{selectedEntry.clientName}</h3>
                      {selectedEntry.parentName && (
                        <p className="text-sm text-muted-foreground">{selectedEntry.parentName}</p>
                      )}
                    </div>
                    <Badge className={getActionMeta(selectedEntry.action).badgeClass}>
                      {getActionMeta(selectedEntry.action).label}
                    </Badge>
                    {selectedEntry.followUpResolved && (
                      <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">
                        Relance traitée
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2 text-sm md:mt-4 md:grid-cols-2 md:gap-3">
                    <InfoItem label="Date" value={format(new Date(selectedEntry.date), "dd/MM/yyyy", { locale: fr })} />
                    <InfoItem label="Heure" value={selectedEntry.time} />
                    {selectedEntry.details.recallDate && (
                      <InfoItem
                        label="Date de rappel"
                        value={format(new Date(selectedEntry.details.recallDate), "dd/MM/yyyy", { locale: fr })}
                      />
                    )}
                    {selectedEntry.details.resolvedFollowUpAt && (
                      <InfoItem
                        label="Relance prévue le"
                        value={format(new Date(selectedEntry.details.resolvedFollowUpAt), "dd/MM/yyyy HH:mm", { locale: fr })}
                      />
                    )}
                  </div>
                </div>

                {selectedEntry.details.products && selectedEntry.details.products.length > 0 && (
                  <div className="overflow-hidden rounded-xl border bg-white sm:rounded-2xl">
                    <div className="border-b p-3 sm:p-4">
                      <h3 className="flex items-center gap-2 font-semibold text-slate-950">
                        <ShoppingCart className="h-4 w-4 text-primary" />
                        Produits commandés
                      </h3>
                    </div>
                    <div className="divide-y">
                      {selectedEntry.details.products.map((product, index) => (
                        <div key={`${product.product}-${index}`} className="flex items-center justify-between gap-3 p-3 sm:p-4">
                          <div>
                            <div className="font-medium text-slate-900">{product.product}</div>
                            {product.reference && <div className="text-xs text-muted-foreground">{product.reference}</div>}
                          </div>
                          <Badge variant="outline" className="rounded-full">
                            Qté {product.quantity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEntry.details.comment && (
                  <div className="rounded-xl border bg-blue-50 p-3 sm:rounded-2xl sm:p-4">
                    <h3 className="mb-2 flex items-center gap-2 font-semibold text-blue-800">
                      <MessageSquare className="h-4 w-4" />
                      Note
                    </h3>
                    <p className="rounded-xl bg-white p-3 text-sm">{selectedEntry.details.comment}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  helper,
}: {
  label: string
  value: number | string
  icon: typeof Phone
  helper: string
}) {
  return (
    <div className="rounded-xl border bg-white p-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold leading-tight text-slate-950">{value}</div>
          <div className="text-[11px] text-muted-foreground">{helper}</div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

function DateFilterButton({
  date,
  onSelect,
  placeholder,
}: {
  date?: Date
  onSelect: (date?: Date) => void
  placeholder: string
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 justify-start rounded-xl border-slate-200 bg-slate-50 text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy", { locale: fr }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus />
      </PopoverContent>
    </Popover>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold text-slate-900">{value}</div>
    </div>
  )
}
