"use client"

import { type FormEvent, useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { CheckCircle, Clock, Loader2, Search, XCircle } from "lucide-react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AdminCommercialBlReview, getAdminCommercialBlReviews, reviewAdminCommercialBl } from "@/actions/commercial-admin"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { activePageRefetchOptions, queryKeys } from "@/lib/query-keys"

type Props = {
  initialBls: AdminCommercialBlReview[]
  initialFilters: {
    status: string
    search: string
  }
}

const ALL_STATUS = "all"
const DEFAULT_STATUS = "CONFIRME"

function normalizeSearchTerm(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function statusSearchText(status: AdminCommercialBlReview["status"]) {
  if (status === "CONFIRME") return "confirme en attente admin attente"
  if (status === "VALIDE_ADMIN") return "valide autorise facturation"
  if (status === "REJETE_ADMIN") return "rejete rejet"
  if (status === "FACTURE") return "facture factures"
  return status
}

function statusBadge(status: AdminCommercialBlReview["status"]) {
  if (status === "CONFIRME") {
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">En attente ADMIN</Badge>
  }
  if (status === "VALIDE_ADMIN") {
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Autorisé facturation</Badge>
  }
  if (status === "FACTURE") {
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Facturé</Badge>
  }
  return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Rejeté</Badge>
}

function decisionLabel(status: AdminCommercialBlReview["status"]) {
  if (status === "VALIDE_ADMIN" || status === "FACTURE") return "Validé par"
  if (status === "REJETE_ADMIN") return "Rejeté par"
  return "Décision par"
}

const STAT_STYLES = {
  pending: {
    card: "border-amber-200 bg-amber-50",
    label: "text-amber-700",
    value: "text-amber-950",
    icon: "bg-amber-100 text-amber-700",
  },
  approved: {
    card: "border-green-200 bg-green-50",
    label: "text-green-700",
    value: "text-green-950",
    icon: "bg-green-100 text-green-700",
  },
  rejected: {
    card: "border-red-200 bg-red-50",
    label: "text-red-700",
    value: "text-red-950",
    icon: "bg-red-100 text-red-700",
  },
  factured: {
    card: "border-blue-200 bg-blue-50",
    label: "text-blue-700",
    value: "text-blue-950",
    icon: "bg-blue-100 text-blue-700",
  },
} as const

function RejectReasonForm({
  blId,
  isReviewing,
  onCancel,
  onConfirm,
}: {
  blId: string
  isReviewing: boolean
  onCancel: () => void
  onConfirm: (id: string, note: string) => void
}) {
  const [note, setNote] = useState("")

  return (
    <div className="ml-auto flex max-w-sm flex-col gap-2">
      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Motif du rejet obligatoire..."
        className="min-h-16 resize-none rounded-xl text-sm"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isReviewing}>
          Annuler
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onConfirm(blId, note)}
          disabled={isReviewing}
          className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
        >
          {isReviewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
          Confirmer rejet
        </Button>
      </div>
    </div>
  )
}

export default function AdminCommercialBlReviewClient({ initialBls, initialFilters }: Props) {
  const [search, setSearch] = useState(initialFilters.search)
  const [status, setStatus] = useState(initialFilters.status || DEFAULT_STATUS)
  const [isPending, startTransition] = useTransition()
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [selectedProductsBl, setSelectedProductsBl] = useState<AdminCommercialBlReview | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const { data: bls = initialBls } = useQuery({
    queryKey: queryKeys.adminCommercialBlReviews(ALL_STATUS),
    queryFn: () =>
      getAdminCommercialBlReviews(undefined, { throwOnError: true }),
    initialData: initialBls,
    ...activePageRefetchOptions,
  })

  const visibleBls = useMemo(() => {
    const term = normalizeSearchTerm(search)
    return bls.filter((bl) => {
      const matchesStatus = status === ALL_STATUS || bl.status === status
      if (!matchesStatus) return false
      if (!term) return true

      return [
        bl.clientName,
        bl.clientAccountNumber,
        bl.parentName,
        bl.agentName,
        bl.numeroCommande,
        bl.reviewer,
        bl.adminReviewComment,
        statusSearchText(bl.status),
      ].some((value) => normalizeSearchTerm(value).includes(term))
    })
  }, [bls, search, status])

  const summary = useMemo(() => ({
    pending: bls.filter((bl) => bl.status === "CONFIRME").length,
    approved: bls.filter((bl) => bl.status === "VALIDE_ADMIN").length,
    rejected: bls.filter((bl) => bl.status === "REJETE_ADMIN").length,
    factured: bls.filter((bl) => bl.status === "FACTURE").length,
  }), [bls])

  useEffect(() => {
    setSearch(initialFilters.search)
    setStatus(initialFilters.status || DEFAULT_STATUS)
  }, [initialFilters.search, initialFilters.status])

  const syncUrl = useCallback((nextStatus: string, nextSearch: string) => {
    const params = new URLSearchParams()
    params.set("status", nextStatus || DEFAULT_STATUS)
    if (nextSearch.trim()) params.set("search", nextSearch.trim())
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }, [pathname, router, startTransition])

  const handleFilterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    syncUrl(status, search)
  }

  const handleStatusChange = (nextStatus: string) => {
    setStatus(nextStatus)
    syncUrl(nextStatus, search)
  }

  const handleReview = useCallback(async (id: string, decision: "VALIDER" | "REJETER", rawNote = "") => {
    const note = rawNote.trim()
    if (decision === "REJETER" && !note) {
      toast({
        title: "Commentaire requis",
        description: "Ajoutez le motif du rejet pour notifier le commercial.",
        variant: "destructive",
      })
      return
    }

    setReviewingId(id)
    const result = await reviewAdminCommercialBl(id, decision, note)
    setReviewingId(null)

    if (!result.success) {
      toast({
        title: "Action impossible",
        description: result.error,
        variant: "destructive",
      })
      return
    }

    toast({
      title: decision === "VALIDER" ? "BC autorisé" : "BC rejeté",
      description: decision === "VALIDER"
        ? "Le service facturation peut maintenant voir ce BC."
        : "Le commercial concerné a été notifié.",
    })
    if (decision === "REJETER") {
      setRejectingId(null)
    }
    if (status !== ALL_STATUS) {
      setStatus(ALL_STATUS)
      syncUrl(ALL_STATUS, search)
    }
    queryClient.invalidateQueries({ queryKey: ["admin-commercial-bl-reviews"] })
    queryClient.invalidateQueries({ queryKey: ["commercial-orders"] })
    queryClient.invalidateQueries({ queryKey: ["agent-clients"] })
    queryClient.invalidateQueries({ queryKey: ["facturation-commercial-bls"] })
    queryClient.invalidateQueries({ queryKey: ["notifications"] })
  }, [queryClient, search, status, syncUrl, toast])

  const columns = useMemo<ColumnDef<AdminCommercialBlReview>[]>(() => [
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
          onClick={() => setSelectedProductsBl(row.original)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              setSelectedProductsBl(row.original)
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
      header: "Confirmé le",
      cell: ({ row }) => row.original.confirmedAt
        ? format(new Date(row.original.confirmedAt), "dd/MM/yyyy HH:mm", { locale: fr })
        : "—",
    },
    {
      id: "status",
      header: "Statut",
      cell: ({ row }) => statusBadge(row.original.status),
    },
    {
      id: "decision",
      header: () => <div className="text-right">Décision</div>,
      cell: ({ row }) => {
        const bl = row.original
        if (bl.status !== "CONFIRME") {
          return (
            <div className="max-w-xs space-y-1 text-right text-sm">
              <div className="font-medium text-slate-700">
                {decisionLabel(bl.status)} {bl.reviewer || "ADMIN non renseigné"}
              </div>
              {bl.adminReviewComment && (
                <div className="text-muted-foreground">{bl.adminReviewComment}</div>
              )}
            </div>
          )
        }

        if (rejectingId === bl.id) {
          return (
            <RejectReasonForm
              blId={bl.id}
              isReviewing={reviewingId === bl.id}
              onCancel={() => setRejectingId(null)}
              onConfirm={(targetId, note) => handleReview(targetId, "REJETER", note)}
            />
          )
        }

        return (
          <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectingId(bl.id)}
                disabled={reviewingId === bl.id}
                className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Rejeter
              </Button>
              <Button size="sm" onClick={() => handleReview(bl.id, "VALIDER")} disabled={reviewingId === bl.id}>
                {reviewingId === bl.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Valider
              </Button>
          </div>
        )
      },
    },
  ], [handleReview, rejectingId, reviewingId])

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

  return (
    <div className="p-2 md:p-3">
      <Card className="shadow-sm">
        <CardContent className="space-y-3 p-3">
          <div className="flex flex-col gap-3 border-b pb-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/60">Administration</p>
              <h1 className="text-lg font-bold leading-tight text-gray-900">Validation des BC commerciaux</h1>
              <p className="truncate text-xs text-muted-foreground">
                Les BC confirmés doivent être validés par l’ADMIN avant la facturation.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
              <Stat label="En attente" value={summary.pending} icon={Clock} tone="pending" />
              <Stat label="Autorisés" value={summary.approved} icon={CheckCircle} tone="approved" />
              <Stat label="Rejetés" value={summary.rejected} icon={XCircle} tone="rejected" />
              <Stat label="Facturés" value={summary.factured} icon={CheckCircle} tone="factured" />
            </div>
          </div>

          <form onSubmit={handleFilterSubmit} className="grid gap-2 md:grid-cols-[1fr_200px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher client, commercial ou commande..."
                className="h-9 pl-10"
              />
            </div>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="CONFIRME">En attente ADMIN</SelectItem>
                <SelectItem value="VALIDE_ADMIN">Autorisés facturation</SelectItem>
                <SelectItem value="REJETE_ADMIN">Rejetés</SelectItem>
                <SelectItem value="FACTURE">Facturés</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={isPending} className="h-9">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
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
                        Aucun BC commercial trouvé.
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
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                Précédent
              </Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Suivant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedProductsBl} onOpenChange={(open) => !open && setSelectedProductsBl(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Détails des produits</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="font-semibold text-slate-900">{selectedProductsBl?.numeroCommande}</div>
              <div className="text-muted-foreground">{selectedProductsBl?.clientName}</div>
            </div>
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="w-24 text-right">Quantité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedProductsBl?.products.map((product) => (
                    <TableRow key={`${product.productId}-${product.productName}`}>
                      <TableCell>
                        <div className="font-medium">{product.productName || "Produit sans nom"}</div>
                        {product.productReference && (
                          <div className="text-xs text-muted-foreground">{product.productReference}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{product.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
  icon: typeof Clock
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
