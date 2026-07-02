"use client"

import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { CheckCircle, ChevronDown, Clock, History, Loader2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { LucideIcon } from "lucide-react"
import {
  CommercialBlEditRequest,
  getCommercialBlEditRequestHistory,
  getCommercialBlEditRequests,
  reviewCommercialBlEditRequest,
} from "@/actions/commercial-admin"
import { activePageRefetchOptions, queryKeys } from "@/lib/query-keys"

type Props = {
  initialRequests: CommercialBlEditRequest[]
  initialHistoryRequests: CommercialBlEditRequest[]
}

export default function CommercialBlRequestsClient({ initialRequests, initialHistoryRequests }: Props) {
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data: requests = initialRequests } = useQuery({
    queryKey: queryKeys.commercialBlRequests(),
    queryFn: getCommercialBlEditRequests,
    initialData: initialRequests,
    ...activePageRefetchOptions,
  })
  const { data: historyRequests = initialHistoryRequests } = useQuery({
    queryKey: queryKeys.commercialBlRequestHistory(),
    queryFn: getCommercialBlEditRequestHistory,
    initialData: initialHistoryRequests,
    ...activePageRefetchOptions,
  })
  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "EN_ATTENTE"),
    [requests]
  )
  const visibleHistory = useMemo(
    () => historyRequests.filter((request) => request.status !== "EN_ATTENTE"),
    [historyRequests]
  )

  const handleReview = async (id: string, decision: "APPROUVER" | "REFUSER") => {
    setLoadingId(id)
    const result = await reviewCommercialBlEditRequest(id, decision, notes[id])
    setLoadingId(null)

    if (!result.success) {
      toast({
        title: "Erreur",
        description: result.error,
        variant: "destructive",
      })
      return
    }

    queryClient.invalidateQueries({ queryKey: ["commercial-bl-requests"] })
    queryClient.invalidateQueries({ queryKey: ["commercial-orders"] })
    queryClient.invalidateQueries({ queryKey: ["agent-clients"] })
    queryClient.invalidateQueries({ queryKey: ["notifications"] })
    toast({
      title: decision === "APPROUVER" ? "Modification autorisée" : "Demande refusée",
      description:
        decision === "APPROUVER"
          ? "Le commercial peut modifier le BC une fois, puis il repassera en validation ADMIN."
          : "Le BC reste verrouillé.",
    })
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-3 p-3">
        <div className="flex flex-col gap-3 border-b pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/60">Validation</p>
            <h1 className="text-lg font-bold leading-tight text-slate-950">Demandes de modification BC</h1>
            <p className="truncate text-xs text-muted-foreground">
              Autorisez ou refusez les modifications demandées sur les BC commerciaux confirmés.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-[360px]">
            <Stat label="En attente" value={pendingRequests.length} tone="pending" />
            <Stat label="Historique" value={visibleHistory.length} tone="history" />
          </div>
        </div>

        <section className="grid gap-3">
          <SectionTitle
            title="Demandes en attente"
            description="Demandes nécessitant une décision du responsable."
          />
          {pendingRequests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-center gap-3 py-6 text-center">
                <CheckCircle className="h-7 w-7 text-green-600" />
                <div className="text-left">
                  <h3 className="font-semibold">Aucune demande en attente</h3>
                  <p className="text-xs text-muted-foreground">Les nouvelles demandes apparaîtront ici.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request) => (
              <Card key={request.id} className="overflow-hidden border-none shadow-sm">
                <CardContent className="space-y-2 p-2">
                  <RequestHeader
                    request={request}
                    expanded={Boolean(expanded[request.id])}
                    onToggle={() => setExpanded((current) => ({ ...current, [request.id]: !current[request.id] }))}
                  />
                  {expanded[request.id] && (
                    <>
                      <SnapshotCompare beforeSnapshot={request.beforeSnapshot} afterSnapshot={request.afterSnapshot} />
                      <Textarea
                        value={notes[request.id] || ""}
                        onChange={(event) =>
                          setNotes((current) => ({ ...current, [request.id]: event.target.value }))
                        }
                        placeholder="Note de réponse optionnelle"
                        className="min-h-16 rounded-xl text-sm"
                      />

                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={loadingId === request.id}
                          onClick={() => handleReview(request.id, "REFUSER")}
                        >
                          {loadingId === request.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                          Refuser
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-xl"
                          disabled={loadingId === request.id}
                          onClick={() => handleReview(request.id, "APPROUVER")}
                        >
                          {loadingId === request.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                          Autoriser la modification
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </section>

        <section className="grid gap-3">
          <SectionTitle
            icon={History}
            title="Historique des demandes"
            description="Demandes traitées avec état avant et après modification."
          />
          {visibleHistory.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Aucun historique de demande pour le moment.
              </CardContent>
            </Card>
          ) : (
            visibleHistory.map((request) => (
              <Card key={request.id} className="overflow-hidden border-none shadow-sm">
                <CardContent className="space-y-2 p-2">
                  <RequestHeader
                    request={request}
                    expanded={Boolean(expanded[request.id])}
                    onToggle={() => setExpanded((current) => ({ ...current, [request.id]: !current[request.id] }))}
                  />
                  {expanded[request.id] && (
                    <>
                      <SnapshotCompare beforeSnapshot={request.beforeSnapshot} afterSnapshot={request.afterSnapshot} />
                      {request.responseNote && (
                        <div className="rounded-xl bg-slate-50 p-2.5 text-sm">
                          <div className="font-medium text-slate-900">Réponse responsable</div>
                          <p className="mt-1 text-muted-foreground">{request.responseNote}</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </section>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "pending" | "history" }) {
  const styles = tone === "pending"
    ? "border-amber-200 bg-amber-50 text-amber-950"
    : "border-blue-200 bg-blue-50 text-blue-950"

  return (
    <div className={`rounded-xl border px-3 py-2 ${styles}`}>
      <div className="text-[11px] font-medium opacity-70">{label}</div>
      <div className="text-lg font-bold leading-none">{value}</div>
    </div>
  )
}

function SectionTitle({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon?: LucideIcon
}) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-primary" />}
      <div>
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function RequestHeader({
  request,
  expanded,
  onToggle,
}: {
  request: CommercialBlEditRequest
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="grid gap-2 md:grid-cols-[1fr_260px_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StatusBadge status={request.status} />
          <span className="text-muted-foreground">
            {format(new Date(request.createdAt), "dd/MM/yyyy HH:mm", { locale: fr })}
          </span>
          <span className="font-semibold text-primary">
            {request.order?.numeroCommande || "Commande inconnue"}
          </span>
        </div>
        <div className="mt-1 truncate text-xs text-muted-foreground">
          {request.order?.clientName || "Client inconnu"}
          {request.order?.parentName ? ` - ${request.order.parentName}` : ""}
        </div>
        <div className="mt-0.5 truncate text-xs">
          Demandé par <span className="font-medium">{request.requester?.name || "Commercial"}</span>
          {request.reviewer?.name ? (
            <> - traité par <span className="font-medium">{request.reviewer.name}</span></>
          ) : null}
        </div>
      </div>
      <div className="min-w-0 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs">
        <span className="font-medium text-slate-900">Motif : </span>
        <span className="text-muted-foreground">{request.reason}</span>
      </div>
      <Button type="button" size="sm" variant="outline" className="h-8 rounded-xl" onClick={onToggle}>
        <ChevronDown className={`mr-1.5 h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        {expanded ? "Replier" : "Détails"}
      </Button>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === "EN_ATTENTE") {
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><Clock className="mr-1 h-3 w-3" />En attente</Badge>
  }
  if (status === "APPROUVEE") {
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Approuvée</Badge>
  }
  if (status === "UTILISEE") {
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Utilisée</Badge>
  }
  if (status === "REFUSEE") {
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Refusée</Badge>
  }
  return <Badge variant="outline">{status}</Badge>
}

function SnapshotCompare({
  beforeSnapshot,
  afterSnapshot,
}: {
  beforeSnapshot: CommercialBlEditRequest["beforeSnapshot"]
  afterSnapshot: CommercialBlEditRequest["afterSnapshot"]
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <SnapshotBlock title="Avant modification" items={beforeSnapshot} emptyText="Aucun snapshot avant." />
      <SnapshotBlock title="Après modification" items={afterSnapshot} emptyText="Modification pas encore utilisée." />
    </div>
  )
}

function SnapshotBlock({
  title,
  items,
  emptyText,
}: {
  title: string
  items: CommercialBlEditRequest["beforeSnapshot"]
  emptyText: string
}) {
  return (
    <div className="rounded-xl border bg-white p-2.5">
      <div className="mb-2 text-sm font-medium text-slate-900">{title}</div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {items.map((item, index) => (
            <div key={`${item.productId}-${index}`} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-xs">
              <div className="min-w-0">
                <div className="font-medium text-slate-900">{item.productName || `Produit #${item.productId}`}</div>
                {item.productReference && <div className="text-xs text-muted-foreground">{item.productReference}</div>}
              </div>
              <Badge variant="outline" className="shrink-0 rounded-full text-[11px]">Qté {item.quantity}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
