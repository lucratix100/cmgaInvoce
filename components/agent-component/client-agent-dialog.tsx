"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  Ban,
  ChevronDown,
  User,
  MapPin,
  Phone,
  Hash,
  ShoppingCart,
  Clock,
  Plus,
  Trash2,
  Package,
  Check,
  Loader2,
  PhoneOff,
  MoreHorizontal,
  X,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  AgentClient,
  AgentProduct,
  CommercialExecutionStatus,
  getAgentProducts,
  submitClientExecution,
} from "@/actions/agent-actions"
import { EXECUTION_STATUS_COLORS, EXECUTION_STATUS_LABELS } from "@/lib/agent-utils"

interface ClientSheetDialogProps {
  isOpen: boolean
  onClose: () => void
  client: AgentClient | null
  onSuccess?: () => void
}

interface OrderItem {
  id: string
  productId: number
  productName: string
  quantity: number
}

type ActionId = CommercialExecutionStatus | "STOCK_DISPONIBLE" | "AUTRE"

const ACTION_CONFIG: Array<{
  id: ActionId
  status: CommercialExecutionStatus
  label: string
  icon: LucideIcon
  activeClass: string
  inactiveClass: string
  defaultComment?: string
}> = [
  {
    id: "APPELE",
    status: "APPELE",
    label: "Non commandé",
    icon: Ban,
    activeClass: "bg-emerald-600 hover:bg-emerald-700",
    inactiveClass: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  },
  {
    id: "NON_REPONDU",
    status: "NON_REPONDU",
    label: "Non répondu",
    icon: PhoneOff,
    activeClass: "bg-orange-600 hover:bg-orange-700",
    inactiveClass: "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100",
  },
  {
    id: "COMMANDE_PRISE",
    status: "COMMANDE_PRISE",
    label: "Commande prise",
    icon: ShoppingCart,
    activeClass: "bg-blue-600 hover:bg-blue-700",
    inactiveClass: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
  },
  {
    id: "A_RELANCER",
    status: "A_RELANCER",
    label: "À relancer",
    icon: Clock,
    activeClass: "bg-amber-600 hover:bg-amber-700",
    inactiveClass: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  },
  {
    id: "STOCK_DISPONIBLE",
    status: "APPELE",
    label: "Stock disponible",
    icon: Package,
    activeClass: "bg-teal-600 hover:bg-teal-700",
    inactiveClass: "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100",
    defaultComment: "stock disponible",
  },
  {
    id: "AUTRE",
    status: "APPELE",
    label: "Autre",
    icon: MoreHorizontal,
    activeClass: "bg-slate-600 hover:bg-slate-700",
    inactiveClass: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
    defaultComment: "autre",
  },
]

export function ClientSheetDialog({ isOpen, onClose, client, onSuccess }: ClientSheetDialogProps) {
  const { toast } = useToast()
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [recallDate, setRecallDate] = useState("")
  const [recallTime, setRecallTime] = useState("")
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAction, setSelectedAction] = useState<ActionId | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState("0")
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isCommentOpen, setIsCommentOpen] = useState(false)

  const selectedActionConfig = ACTION_CONFIG.find((action) => action.id === selectedAction)
  const shouldLoadProducts = isOpen && selectedActionConfig?.status === "COMMANDE_PRISE"
  const { data: products = [], isLoading: loadingProducts } = useQuery<AgentProduct[]>({
    queryKey: ["agent-products"],
    queryFn: getAgentProducts,
    enabled: shouldLoadProducts,
    staleTime: 5 * 60 * 1000,
  })
  const selectedProduct = products.find((p) => p.id === selectedProductId)

  const resetForm = () => {
    setOrderItems([])
    setRecallDate("")
    setRecallTime("")
    setComment("")
    setSelectedAction(null)
    setSelectedProductId(null)
    setQuantity("0")
    setIsHistoryOpen(false)
    setIsCommentOpen(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const addOrderItem = () => {
    if (!selectedProduct || !quantity || Number(quantity) <= 0) {
      toast({
        title: "Champs manquants",
        description: "Sélectionnez un produit et une quantité valide.",
        variant: "destructive",
      })
      return
    }

    if (orderItems.some((item) => item.productId === selectedProduct.id)) {
      toast({
        title: "Produit déjà ajouté",
        description: "Ce produit est déjà dans la liste. Supprimez-le d'abord si vous voulez le changer.",
        variant: "destructive",
      })
      return
    }

    setIsAddingItem(true)
    setOrderItems((prev) => [
      ...prev,
      {
        id: `${selectedProduct.id}-${Date.now()}`,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity: Number(quantity),
      },
    ])
    setSelectedProductId(null)
    setQuantity("0")
    setIsAddingItem(false)
  }

  const removeOrderItem = (id: string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleSubmit = async () => {
    if (!client || !selectedActionConfig) {
      toast({
        title: "Action requise",
        description: "Sélectionnez un statut avant de valider.",
        variant: "destructive",
      })
      return
    }

    if (client.canModify === false) {
      toast({
        title: "Modification bloquée",
        description: "Cette fiche n'est modifiable que le jour de la tournée ou à la date de relance.",
        variant: "destructive",
      })
      return
    }

    if (selectedActionConfig.status === "COMMANDE_PRISE" && orderItems.length === 0) {
      toast({
        title: "Commande vide",
        description: "Ajoutez au moins un produit pour une commande prise.",
        variant: "destructive",
      })
      return
    }

    if (selectedActionConfig.status === "A_RELANCER" && !recallDate) {
      toast({
        title: "Date de relance requise",
        description: "Sélectionnez une date de rappel.",
        variant: "destructive",
      })
      return
    }

    if (selectedActionConfig.status === "A_RELANCER" && !recallTime) {
      toast({
        title: "Heure de relance requise",
        description: "Sélectionnez l'heure à laquelle le client doit être rappelé.",
        variant: "destructive",
      })
      return
    }

    if (selectedActionConfig.id === "AUTRE" && !comment.trim()) {
      toast({
        title: "Commentaire obligatoire",
        description: "Ajoutez un commentaire lorsque vous choisissez Autre.",
        variant: "destructive",
      })
      setIsCommentOpen(true)
      return
    }

    setIsSubmitting(true)

    try {
      const trimmedComment = comment.trim()
      const finalComment = selectedActionConfig.defaultComment
        ? trimmedComment
          ? `${selectedActionConfig.defaultComment} - ${trimmedComment}`
          : selectedActionConfig.defaultComment
        : trimmedComment || undefined

      const result = await submitClientExecution({
        planningItemId: client.id,
        status: selectedActionConfig.status,
        comment: finalComment,
        nextFollowUpAt: recallDate && recallTime ? `${recallDate}T${recallTime}:00` : undefined,
        orderTaken: selectedActionConfig.status === "COMMANDE_PRISE",
        orderLines: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      })

      if (!result.success) {
        throw new Error(result.message || "Enregistrement impossible")
      }

      toast({
        title: "Action enregistrée",
        description: `${selectedActionConfig.label} — ${client.name}`,
      })

      onSuccess?.()
      handleClose()
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!client || !isOpen) return null
  const canModify = client.canModify !== false
  const callablePhone = client.phone?.replace(/[^\d+]/g, "")

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => !isSubmitting && handleClose()}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-slate-100 hover:text-slate-900"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fermer</span>
        </button>

        <div className="mb-4 flex items-center gap-2 text-base font-semibold text-primary">
          <User className="h-5 w-5" />
          Fiche client — action commerciale
        </div>

        <div className="rounded-xl border bg-gray-50 p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-gray-900">{client.name}</span>
            {client.parentName && (
              <Badge variant="secondary" className="text-xs">{client.parentName}</Badge>
            )}
            {client.executionStatus && (
              <Badge className={EXECUTION_STATUS_COLORS[client.executionStatus]}>
                {EXECUTION_STATUS_LABELS[client.executionStatus]}
              </Badge>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {client.address && (
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{client.address}</span>
            )}
            {client.phone && (
              <a
                href={`tel:${callablePhone || client.phone}`}
                className="inline-flex items-center gap-1 rounded-full text-primary underline-offset-2 hover:underline"
                title={`Appeler ${client.phone}`}
              >
                <Phone className="h-3 w-3" />
                {client.phone}
              </a>
            )}
            {client.accountNumber && (
              <span className="inline-flex items-center gap-1"><Hash className="h-3 w-3" />{client.accountNumber}</span>
            )}
          </div>
          {client.instructions && (
            <p className="mt-2 text-xs text-amber-700">{client.instructions}</p>
          )}
        </div>

        {!canModify && (
          <div className="rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            Cette fiche est en lecture seule. La modification est autorisée uniquement le jour de la tournée ou à la date de relance.
          </div>
        )}

        {client.recentLogs && client.recentLogs.length > 0 && (
          <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen} className="rounded-xl border bg-white">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Historique récent
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {client.recentLogs.length} action{client.recentLogs.length > 1 ? "s" : ""} récente{client.recentLogs.length > 1 ? "s" : ""}
                  </p>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isHistoryOpen && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t px-3 py-2">
              <div className="space-y-1.5">
                {client.recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded-lg border bg-gray-50 px-3 py-2 text-xs">
                    <div className="flex min-w-0 items-center gap-2">
                      <Badge className={EXECUTION_STATUS_COLORS[log.status]}>{EXECUTION_STATUS_LABELS[log.status]}</Badge>
                      {log.comment && <span className="truncate text-muted-foreground">{log.comment}</span>}
                    </div>
                    <span className="ml-2 shrink-0 text-muted-foreground">
                      {format(new Date(log.createdAt), "dd/MM HH:mm", { locale: fr })}
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Résultat de l&apos;appel</p>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-3 sm:gap-2">
            {ACTION_CONFIG.map(({ id, label, icon: Icon, activeClass, inactiveClass }) => (
              <Button
                key={id}
                variant={selectedAction === id ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedAction(id)
                  if (id === "AUTRE") {
                    setIsCommentOpen(true)
                  }
                }}
                disabled={!canModify}
                aria-label={label}
                title={label}
                className={cn(
                  "h-10 justify-center border px-0 transition-all sm:h-9 sm:px-3",
                  selectedAction === id ? activeClass : inactiveClass
                )}
              >
                <Icon className="h-4 w-4 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Button>
            ))}
          </div>
          {selectedActionConfig && (
            <p className=" text-center text-[11px] font-semibold text-muted-foreground sm:hidden">
               {selectedActionConfig.label}
            </p>
          )}
        </div>

        {selectedActionConfig?.status === "COMMANDE_PRISE" && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                <ShoppingCart className="h-4 w-4" />
                Lignes de commande
              </h3>
              <Badge variant="secondary" className="h-6">{orderItems.length} produit(s)</Badge>
            </div>

            <div className="mb-3 grid grid-cols-[1fr_110px_44px] items-center gap-2 rounded-xl border bg-white p-2">
              <select
                value={selectedProductId ?? ""}
                onChange={(event) => setSelectedProductId(event.target.value ? Number(event.target.value) : null)}
                disabled={loadingProducts || !canModify}
                className="h-10 min-w-0 rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">{loadingProducts ? "Chargement..." : "Sélectionner un produit..."}</option>
                {products.map((product) => {
                  const alreadyAdded = orderItems.some((item) => item.productId === product.id)
                  return (
                    <option key={product.id} value={product.id} disabled={alreadyAdded}>
                      {product.name}{product.reference ? ` (${product.reference})` : ""}{alreadyAdded ? " — déjà ajouté" : ""}
                    </option>
                  )
                })}
              </select>

              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-10 w-full text-center text-base font-semibold"
                min="1"
                disabled={!canModify}
              />

              <Button size="sm" className="h-10 w-11 p-0" onClick={addOrderItem} disabled={isAddingItem || !selectedProductId || !canModify}>
                {isAddingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>

            {orderItems.length > 0 ? (
              <div className="rounded-xl border bg-white p-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {orderItems.map((item, index) => (
                  <div key={item.id} className="relative rounded-lg border bg-white p-2 shadow-sm">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">#{index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-red-600 hover:bg-red-50"
                        onClick={() => removeOrderItem(item.id)}
                        disabled={!canModify}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="line-clamp-1 text-xs font-semibold text-slate-900" title={`${item.productName} : x${item.quantity}`}>
                      {item.productName} : <span className="text-blue-700">x{item.quantity}</span>
                    </div>
                  </div>
                ))}
                </div>
                <Button variant="outline" size="sm" className="mt-2 h-8 text-xs text-red-600" onClick={() => setOrderItems([])} disabled={!canModify}>
                  <Trash2 className="mr-1 h-3 w-3" />
                  Vider la liste
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border bg-white p-4 text-center text-sm text-muted-foreground">
                <Package className="mx-auto mb-2 h-6 w-6 text-gray-300" />
                Aucun produit ajouté
              </div>
            )}
          </div>
        )}

        {selectedActionConfig?.status === "A_RELANCER" && (
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
              <Clock className="h-4 w-4" />
              Date et heure de relance
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-amber-900">Date</label>
                <Input
                  type="date"
                  value={recallDate}
                  onChange={(event) => setRecallDate(event.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                  disabled={!canModify}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-amber-900">Heure</label>
                <Input
                  type="time"
                  value={recallTime}
                  onChange={(event) => setRecallTime(event.target.value)}
                  disabled={!canModify}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-amber-700">
              La notification apparaîtra dès 00h le jour choisi. L'heure sert à préciser le moment du rappel.
            </p>
          </div>
        )}

        <Collapsible open={isCommentOpen} onOpenChange={setIsCommentOpen} className="mt-4 rounded-xl border bg-white sm:mt-5">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {selectedAction === "AUTRE" ? "Commentaire obligatoire" : "Commentaire"}
                </span>
                {selectedAction === "AUTRE" && (
                  <Badge variant="secondary" className="h-5 text-[10px] text-red-700">
                    Requis
                  </Badge>
                )}
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isCommentOpen && "rotate-180")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t p-3">
            <Textarea
              placeholder={selectedAction === "AUTRE" ? "Expliquez l'autre résultat..." : "Notes sur l'appel..."}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="resize-none"
              disabled={!canModify}
            />
          </CollapsibleContent>
        </Collapsible>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSubmit} disabled={!selectedAction || isSubmitting || !canModify} className="flex-1">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Enregistrer l&apos;action
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annuler
          </Button>
        </div>
      </div>
    </div>
  )
}
