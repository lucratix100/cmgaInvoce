"use client"

import { type FormEvent, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { CheckCircle, Clock, Eye, FileText, Loader2, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  FacturationCommercialBl,
  FacturationBlStatus,
  getFacturationCommercialBls,
  markCommercialBlAsFactured,
} from "@/actions/facturation-actions"
import { activePageRefetchOptions, queryKeys } from "@/lib/query-keys"

type Props = {
  initialBls: FacturationCommercialBl[]
}

const ALL_STATUS = "all"
const DEFAULT_STATUS = "VALIDE_ADMIN"

function normalizeSearchTerm(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function statusSearchText(status: FacturationBlStatus) {
  if (status === "VALIDE_ADMIN") return "autorise admin valide a facturer"
  if (status === "FACTURE") return "facture factures"
  return status
}

function getArrivalTimestamp(bl: FacturationCommercialBl) {
  const date = bl.adminReviewedAt || bl.confirmedAt || bl.facturedAt
  return date ? new Date(date).getTime() : 0
}

function statusBadge(status: FacturationBlStatus) {
  if (status === "VALIDE_ADMIN") {
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Autorisé ADMIN</Badge>
  }
  if (status === "FACTURE") {
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Facturé</Badge>
  }
  return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">En cours de modification</Badge>
}

const STAT_STYLES = {
  total: {
    card: "border-slate-200 bg-slate-50",
    label: "text-slate-600",
    value: "text-slate-950",
    icon: "bg-slate-100 text-slate-700",
  },
  authorized: {
    card: "border-blue-200 bg-blue-50",
    label: "text-blue-700",
    value: "text-blue-950",
    icon: "bg-blue-100 text-blue-700",
  },
  factured: {
    card: "border-green-200 bg-green-50",
    label: "text-green-700",
    value: "text-green-950",
    icon: "bg-green-100 text-green-700",
  },
} as const

export default function FacturationClient({ initialBls }: Props) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState(DEFAULT_STATUS)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [selectedBc, setSelectedBc] = useState<FacturationCommercialBl | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const {
    data: bls = initialBls,
    isFetching: loading,
  } = useQuery({
    queryKey: queryKeys.facturationCommercialBls(),
    queryFn: () => getFacturationCommercialBls(),
    initialData: initialBls,
    ...activePageRefetchOptions,
  })

  const visibleBls = useMemo(() => {
    const term = normalizeSearchTerm(search)

    return bls
      .filter((bl) => {
        const matchesStatus = status === ALL_STATUS || bl.status === status
        if (!matchesStatus) return false
        if (!term) return true

        return [
          bl.numeroCommande,
          bl.clientName,
          bl.clientAccountNumber,
          bl.parentName,
          bl.agentName,
          bl.facturedBy,
          bl.adminReviewComment,
          statusSearchText(bl.status),
        ].some((value) => normalizeSearchTerm(value).includes(term))
      })
      .sort((a, b) => getArrivalTimestamp(a) - getArrivalTimestamp(b) || Number(a.id) - Number(b.id))
  }, [bls, search, status])

  const summary = useMemo(() => ({
    total: bls.length,
    authorized: bls.filter((bl) => bl.status === "VALIDE_ADMIN").length,
    factured: bls.filter((bl) => bl.status === "FACTURE").length,
  }), [bls])

  const columns = useMemo<ColumnDef<FacturationCommercialBl>[]>(() => [
    {
      id: "commande",
      header: "Commande",
      cell: ({ row }) => <span className="font-mono font-semibold">{row.original.numeroCommande}</span>,
    },
    {
      id: "client",
      header: "Client",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.clientName}</div>
          <div className="text-xs font-medium text-slate-700">
            N° compte : {row.original.clientAccountNumber || "Non renseigné"}
          </div>
          <div className="text-xs text-muted-foreground">{row.original.parentName || "Sans enseigne"}</div>
        </div>
      ),
    },
    {
      header: "Commercial",
      accessorKey: "agentName",
    },
    {
      id: "produits",
      header: "Produits",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          role="button"
          tabIndex={0}
          onClick={() => setSelectedBc(row.original)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              setSelectedBc(row.original)
            }
          }}
          className="cursor-pointer rounded-full transition hover:border-primary hover:bg-primary/5 hover:text-primary"
        >
          {row.original.products.length} produit{row.original.products.length > 1 ? "s" : ""}
        </Badge>
      ),
    },
    {
      id: "confirmedAt",
      header: "Arrivée facturation",
      cell: ({ row }) => (row.original.adminReviewedAt || row.original.confirmedAt)
        ? format(new Date(row.original.adminReviewedAt || row.original.confirmedAt!), "dd/MM/yyyy HH:mm", { locale: fr })
        : "—",
    },
    {
      id: "status",
      header: "Statut",
      cell: ({ row }) => statusBadge(row.original.status),
    },
    {
      id: "action",
      header: () => <div className="text-right">Action</div>,
      cell: ({ row }) => {
        const bl = row.original
        return (
          <div className="text-right">
            <Button
              size="sm"
              variant={bl.status === "FACTURE" ? "outline" : "default"}
              onClick={() => setSelectedBc(bl)}
              className="h-8 rounded-full px-3"
            >
              <Eye className="mr-2 h-3.5 w-3.5" />
              Voir BC
            </Button>
          </div>
        )
      },
    },
  ], [])

  const table = useReactTable({
    data: visibleBls,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  })

  const applyFilters = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
  }

  const handleMarkFactured = async (id: string) => {
    setMarkingId(id)
    const result = await markCommercialBlAsFactured(id)
    setMarkingId(null)

    if (!result.success) {
      toast({
        title: "Facturation bloquée",
        description: result.error,
        variant: "destructive",
      })
      return
    }

    toast({
      title: "BC facturé",
      description: "Le bon de commande est marqué comme facturé.",
    })
    setSelectedBc(null)
    queryClient.invalidateQueries({ queryKey: ["facturation-commercial-bls"] })
    queryClient.invalidateQueries({ queryKey: ["commercial-orders"] })
    queryClient.invalidateQueries({ queryKey: ["agent-clients"] })
    queryClient.invalidateQueries({ queryKey: ["notifications"] })
  }

  return (
    <div className="mx-auto max-w-7xl p-2 md:p-3">
      <Card className="shadow-sm">
        <CardContent className="space-y-3 p-3">
          <div className="flex flex-col gap-3 border-b pb-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/60">Facturation</p>
              <h1 className="text-lg font-bold leading-tight text-slate-950">BC commerciaux à facturer</h1>
              <p className="truncate text-xs text-muted-foreground">
                Consultez les BC autorisés par l’ADMIN et marquez-les comme facturés.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 lg:min-w-[420px]">
              <Stat label="Total BC" value={summary.total} icon={FileText} tone="total" />
              <Stat label="À facturer" value={summary.authorized} icon={Clock} tone="authorized" />
              <Stat label="Facturés" value={summary.factured} icon={CheckCircle} tone="factured" />
            </div>
          </div>

          <form onSubmit={applyFilters} className="grid gap-2 md:grid-cols-[1fr_200px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  table.setPageIndex(0)
                }}
                placeholder="Rechercher client, commercial ou commande..."
                className="h-9 pl-10"
              />
            </div>
            <Select
              value={status}
              onValueChange={(nextStatus) => {
                setStatus(nextStatus)
                table.setPageIndex(0)
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUS}>Tous les statuts</SelectItem>
                <SelectItem value="VALIDE_ADMIN">Autorisé ADMIN</SelectItem>
                <SelectItem value="FACTURE">Facturé</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={loading} className="h-9">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Rechercher
            </Button>
          </form>

          <div className="overflow-hidden rounded-xl border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="h-8 px-3 text-xs">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        Aucun bon de commande trouvé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="px-3 py-2 text-xs">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>
              Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount() || 1} · {visibleBls.length} BC
            </div>
            <div className="flex gap-2">
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
        </CardContent>
      </Card>

      {selectedBc && (
        <BcDetailsModal
          bc={selectedBc}
          markingId={markingId}
          onClose={() => setSelectedBc(null)}
          onMarkFactured={handleMarkFactured}
        />
      )}
    </div>
  )
}

function BcDetailsModal({
  bc,
  markingId,
  onClose,
  onMarkFactured,
}: {
  bc: FacturationCommercialBl
  markingId: string | null
  onClose: () => void
  onMarkFactured: (id: string) => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b bg-slate-50 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary/60">Bon de commande</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold leading-tight text-slate-950">{bc.numeroCommande}</h2>
              {statusBadge(bc.status)}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8">
            Fermer
          </Button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4">
          <div className="grid gap-3 rounded-2xl border bg-slate-50 p-3 text-sm md:grid-cols-2">
            <Info label="Client" value={bc.clientName || "—"} />
            <Info label="N° compte" value={bc.clientAccountNumber || "Non renseigné"} />
            <Info label="Commercial" value={bc.agentName || "—"} />
            <Info
              label="Date confirmation"
              value={bc.confirmedAt ? format(new Date(bc.confirmedAt), "dd/MM/yyyy HH:mm", { locale: fr }) : "—"}
            />
            <Info
              label="Date facturation"
              value={bc.facturedAt ? format(new Date(bc.facturedAt), "dd/MM/yyyy HH:mm", { locale: fr }) : "Non facturé"}
            />
          </div>

          <div className="overflow-hidden rounded-xl border">
            <div className="grid grid-cols-[1fr_96px] bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Produit</span>
              <span className="text-right">Quantité</span>
            </div>
            <div className="divide-y">
              {bc.products.map((product) => (
                <div key={`${product.productId}-${product.productName}`} className="grid grid-cols-[1fr_96px] items-center px-3 py-2.5 text-sm">
                  <div>
                    <div className="font-medium text-slate-900">{product.productName || "Produit sans nom"}</div>
                    {product.productReference && (
                      <div className="text-xs text-muted-foreground">{product.productReference}</div>
                    )}
                  </div>
                  <div className="text-right font-semibold text-slate-950">{product.quantity}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            {bc.status === "VALIDE_ADMIN" ? (
              <Button onClick={() => onMarkFactured(bc.id)} disabled={markingId === bc.id}>
                {markingId === bc.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Marquer facturé
              </Button>
            ) : (
              <Button disabled variant="secondary">
                Déjà facturé
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold text-slate-900">{value}</div>
    </div>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof FileText
  tone: keyof typeof STAT_STYLES
}) {
  const styles = STAT_STYLES[tone]

  return (
    <div className={`flex items-center justify-between rounded-xl border px-3 py-2 ${styles.card}`}>
      <div className="min-w-0">
        <div className={`truncate text-[11px] ${styles.label}`}>{label}</div>
        <div className={`text-lg font-bold leading-none ${styles.value}`}>{value}</div>
      </div>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
  )
}
