"use client"

import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { 
  CalendarIcon,
  Search, 
  Download, 
  Eye,
  ChevronDown,
  Clock,
  CheckCircle,
  X, 
  User,
  Package,
  Loader2,
  FileText,
  Printer,
  AlertCircle,
  MapPin,
  Phone,
  Hash,
  Plus,
  Trash2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { 
  BonCommande, 
  CommandeFilters,
  CommercialBl,
  confirmCommercialBl,
  createPersonalOrder,
  getCommandes, 
  getPersonalClients,
  exportCommandes,
  PersonalClient,
  PersonalClientInput,
  requestCommercialBlEdit,
  updateCommercialBl,
  cancelCommercialBl
} from "@/actions/commande-actions"
import { AgentProduct, getAgentProducts } from "@/actions/agent-actions"
import { queryKeys } from "@/lib/query-keys"

type PersonalClientForm = {
  name: string
  phone: string
  accountNumber: string
}

type PersonalOrderLine = {
  productId: string
  quantity: string
}

const emptyPersonalClientForm: PersonalClientForm = {
  name: "",
  phone: "",
  accountNumber: "",
}

const toPersonalClientInput = (form: PersonalClientForm): PersonalClientInput => ({
  name: form.name.trim(),
  phone: form.phone.trim(),
  accountNumber: form.accountNumber.trim(),
})

export default function CommandeClientComponent() {
  const [exporting, setExporting] = useState(false)
  const [selectedCommande, setSelectedCommande] = useState<BonCommande | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [blQuantities, setBlQuantities] = useState<Record<number, string>>({})
  const [newBlProductId, setNewBlProductId] = useState("")
  const [newBlProductQuantity, setNewBlProductQuantity] = useState("1")
  const [requestReason, setRequestReason] = useState("")
  const [cancelReason, setCancelReason] = useState("")
  const [blActionMode, setBlActionMode] = useState<"edit" | "cancel" | null>(null)
  const [blSaving, setBlSaving] = useState(false)
  const [isPersonalOrderOpen, setIsPersonalOrderOpen] = useState(false)
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const [personalClientForm, setPersonalClientForm] = useState<PersonalClientForm>(emptyPersonalClientForm)
  const [selectedPersonalClientId, setSelectedPersonalClientId] = useState<string>("new")
  const [personalOrderLines, setPersonalOrderLines] = useState<PersonalOrderLine[]>([{ productId: "", quantity: "1" }])
  const [personalOrderComment, setPersonalOrderComment] = useState("")
  const [personalSaving, setPersonalSaving] = useState(false)
  // Filtres
  const [filters, setFilters] = useState<CommandeFilters>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const {
    data: commandes = [],
    isLoading: loading,
  } = useQuery({
    queryKey: queryKeys.commercialOrders(filters),
    queryFn: () => getCommandes(filters),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  const {
    data: personalClients = [],
  } = useQuery({
    queryKey: queryKeys.personalClients(),
    queryFn: () => getPersonalClients(),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  const {
    data: products = [],
  } = useQuery<AgentProduct[]>({
    queryKey: ["agent-products"],
    queryFn: getAgentProducts,
    refetchOnWindowFocus: false,
  })

  const invalidateCommercialWorkflow = () => {
    queryClient.invalidateQueries({ queryKey: ["commercial-orders"] })
    queryClient.invalidateQueries({ queryKey: ["agent-clients"] })
    queryClient.invalidateQueries({ queryKey: ["personal-clients"] })
    queryClient.invalidateQueries({ queryKey: ["commercial-bl-requests"] })
    queryClient.invalidateQueries({ queryKey: ["admin-commercial-bl-reviews"] })
    queryClient.invalidateQueries({ queryKey: ["facturation-commercial-bls"] })
    queryClient.invalidateQueries({ queryKey: ["notifications"] })
  }

  const openPersonalOrder = (client?: PersonalClient) => {
    setSelectedPersonalClientId(client?.id || (personalClients[0]?.id || "new"))
    setPersonalClientForm(emptyPersonalClientForm)
    setPersonalOrderLines([{ productId: "", quantity: "1" }])
    setPersonalOrderComment("")
    setIsPersonalOrderOpen(true)
  }

  const validatePersonalClientForm = (form: PersonalClientForm) => {
    if (!form.name.trim()) {
      toast({ title: "Client requis", description: "Renseignez le nom du client.", variant: "destructive" })
      return false
    }
    if (!form.phone.trim()) {
      toast({ title: "Téléphone requis", description: "Renseignez le numéro de téléphone du client.", variant: "destructive" })
      return false
    }
    if (!form.accountNumber.trim()) {
      toast({ title: "N° compte requis", description: "Renseignez le numéro de compte du client.", variant: "destructive" })
      return false
    }
    if (!/^\d+$/.test(form.accountNumber.trim())) {
      toast({ title: "Numéro invalide", description: "Le numéro de compte doit contenir uniquement des chiffres.", variant: "destructive" })
      return false
    }
    return true
  }

  const addPersonalOrderLine = () => {
    const selectedProductsCount = new Set(personalOrderLines.map((line) => line.productId).filter(Boolean)).size
    if (products.length > 0 && selectedProductsCount >= products.length) {
      toast({ title: "Tous les produits sont déjà ajoutés", description: "Un produit ne peut être choisi qu'une seule fois.", variant: "destructive" })
      return
    }
    setPersonalOrderLines((current) => [...current, { productId: "", quantity: "1" }])
  }

  const updatePersonalOrderLine = (index: number, patch: Partial<PersonalOrderLine>) => {
    if (patch.productId) {
      const alreadySelected = personalOrderLines.some((line, lineIndex) => lineIndex !== index && line.productId === patch.productId)
      if (alreadySelected) {
        toast({ title: "Produit déjà choisi", description: "Sélectionnez un autre produit pour cette ligne.", variant: "destructive" })
        return
      }
    }
    setPersonalOrderLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line))
    )
  }

  const removePersonalOrderLine = (index: number) => {
    setPersonalOrderLines((current) => current.filter((_, lineIndex) => lineIndex !== index))
  }

  const handleCreatePersonalOrder = async () => {
    const useNewClient = selectedPersonalClientId === "new"
    if (useNewClient && !validatePersonalClientForm(personalClientForm)) return
    if (!useNewClient) {
      const selectedClient = personalClients.find((client) => client.id === selectedPersonalClientId)
      if (!selectedClient) {
        toast({ title: "Client requis", description: "Sélectionnez un client de votre portefeuille.", variant: "destructive" })
        return
      }
      if (!selectedClient.accountNumber) {
        toast({ title: "Numéro de compte requis", description: "Modifiez le client pour renseigner son numéro de compte avant le BC.", variant: "destructive" })
        return
      }
    }

    const orderLines = personalOrderLines
      .map((line) => ({ productId: Number(line.productId), quantity: Number(line.quantity) }))
      .filter((line) => line.productId > 0 && line.quantity > 0)

    if (orderLines.length === 0) {
      toast({ title: "Produit requis", description: "Ajoutez au moins un produit au BC.", variant: "destructive" })
      return
    }
    if (new Set(orderLines.map((line) => line.productId)).size !== orderLines.length) {
      toast({ title: "Produit en double", description: "Chaque produit ne peut être choisi qu'une seule fois.", variant: "destructive" })
      return
    }

    setPersonalSaving(true)
    const result = await createPersonalOrder({
      personalClientId: useNewClient ? undefined : Number(selectedPersonalClientId),
      client: useNewClient ? toPersonalClientInput(personalClientForm) : undefined,
      comment: personalOrderComment.trim() || null,
      orderLines,
    })
    setPersonalSaving(false)

    if (!result.success) {
      toast({ title: "Erreur", description: result.error, variant: "destructive" })
      return
    }

    toast({ title: "BC créé", description: "Le BC est en brouillon. Vous pouvez le confirmer dans la liste." })
    setIsPersonalOrderOpen(false)
    invalidateCommercialWorkflow()
  }

  const handleSearch = () => {
    const newFilters: CommandeFilters = { ...filters }
    
    if (searchTerm) {
      newFilters.client = searchTerm
    }
    if (dateFrom) {
      newFilters.dateFrom = format(dateFrom, 'yyyy-MM-dd')
    }
    if (dateTo) {
      newFilters.dateTo = format(dateTo, 'yyyy-MM-dd')
    }
    
    setFilters(newFilters)
  }

  const clearFilters = () => {
    setFilters({})
    setSearchTerm("")
    setDateFrom(undefined)
    setDateTo(undefined)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportCommandes(filters)
      toast({
        title: "Export réussi",
        description: "Les bons de commande ont été exportés avec succès",
      })
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les commandes",
        variant: "destructive"
      })
    } finally {
      setExporting(false)
    }
  }

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "en_preparation":
        return <Badge className="bg-yellow-100 text-yellow-800">En préparation</Badge>
      case "en_cours_facturation":
        return <Badge className="bg-indigo-100 text-indigo-800">En cours de facturation</Badge>
      case "livree":
        return <Badge className="bg-green-100 text-green-800">Livrée</Badge>
      case "annulee":
        return <Badge className="bg-red-100 text-red-800">Annulée</Badge>
      default:
        return <Badge variant="secondary">{statut}</Badge>
    }
  }

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case "en_preparation":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "en_cours_facturation":
        return <FileText className="h-4 w-4 text-indigo-600" />
      case "livree":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "annulee":
        return <X className="h-4 w-4 text-red-600" />
      default:
        return <Package className="h-4 w-4 text-gray-600" />
    }
  }

  const showCommandeDetails = (commande: BonCommande) => {
    const quantities: Record<number, string> = {}
    commande.items.forEach((item) => {
      quantities[item.productId] = item.quantity
    })

    setSelectedCommande(commande)
    setBlQuantities(quantities)
    setNewBlProductId("")
    setNewBlProductQuantity("1")
    setRequestReason("")
    setCancelReason("")
    setBlActionMode(null)
    setIsDetailDialogOpen(true)
  }

  const getOrderStatusFromBl = (bl: CommercialBl): BonCommande["statut"] =>
    bl.status === "ANNULE"
      ? "annulee"
      : bl.status === "CONFIRME" || bl.status === "VALIDE_ADMIN" || bl.status === "MODIFICATION_DEMANDEE" || bl.status === "FACTURE"
      ? "en_cours_facturation"
      : "en_preparation"

  const updateSelectedCommercialBl = (bl: CommercialBl, updatedItems?: BonCommande["items"]) => {
    const nextStatus = getOrderStatusFromBl(bl)
    setSelectedCommande((current) =>
      current ? { ...current, commercialBl: bl, items: updatedItems || current.items, statut: nextStatus } : current
    )
    invalidateCommercialWorkflow()
  }

  const canEditSelectedBl = selectedCommande?.commercialBl?.status === "BROUILLON" ||
    selectedCommande?.commercialBl?.status === "REJETE_ADMIN" ||
    selectedCommande?.commercialBl?.status === "MODIFICATION_AUTORISEE"
  const canConfirmSelectedBl = selectedCommande?.commercialBl?.status === "BROUILLON" ||
    selectedCommande?.commercialBl?.status === "REJETE_ADMIN"
  const canRequestEditSelectedBl = selectedCommande?.commercialBl?.status === "CONFIRME"
  const canCancelSelectedBl = Boolean(selectedCommande?.commercialBl && !["ANNULE", "FACTURE"].includes(selectedCommande.commercialBl.status))
  const isAuthorizedEditSelectedBl = selectedCommande?.commercialBl?.status === "MODIFICATION_AUTORISEE"

  const handleAddCommercialBlProduct = () => {
    if (!selectedCommande) return
    const product = products.find((item) => String(item.id) === newBlProductId)
    const quantity = Number(newBlProductQuantity)

    if (!product || quantity <= 0) {
      toast({ title: "Produit requis", description: "Sélectionnez un produit et une quantité valide.", variant: "destructive" })
      return
    }

    if (selectedCommande.items.some((item) => item.productId === product.id)) {
      toast({ title: "Produit déjà présent", description: "Ce produit existe déjà dans le BC.", variant: "destructive" })
      return
    }

    const nextItem = {
      id: `new-${product.id}-${Date.now()}`,
      productId: product.id,
      product: product.name,
      reference: product.reference,
      quantity: String(quantity),
    }

    setSelectedCommande((current) =>
      current ? { ...current, items: [...current.items, nextItem] } : current
    )
    setBlQuantities((current) => ({ ...current, [product.id]: String(quantity) }))
    setNewBlProductId("")
    setNewBlProductQuantity("1")
  }

  const handleRemoveCommercialBlProduct = (productId: number) => {
    if (!selectedCommande || selectedCommande.items.length <= 1) {
      toast({ title: "Action impossible", description: "Le BC doit contenir au moins un produit.", variant: "destructive" })
      return
    }

    setSelectedCommande((current) =>
      current ? { ...current, items: current.items.filter((item) => item.productId !== productId) } : current
    )
    setBlQuantities((current) => {
      const next = { ...current }
      delete next[productId]
      return next
    })
  }

  const handleSaveCommercialBl = async () => {
    if (!selectedCommande?.commercialBl) return
    setBlSaving(true)
    const orderLines = selectedCommande.items.map((item) => ({
      productId: item.productId,
      quantity: Number(blQuantities[item.productId] || 0),
    })).filter((line) => line.quantity > 0)

    const result = await updateCommercialBl(selectedCommande.commercialBl.id, orderLines)
    setBlSaving(false)
    if (!result.success) {
      toast({ title: "Erreur", description: result.error, variant: "destructive" })
      return
    }

    const updatedItems = selectedCommande.items.map((item) => ({
      ...item,
      quantity: String(blQuantities[item.productId] || item.quantity),
    }))
    updateSelectedCommercialBl(result.data.bl, updatedItems)
    toast({ title: "BC commercial enregistré", description: "La fiche de tournée est mise à jour." })
  }

  const handleConfirmCommercialBl = async () => {
    if (!selectedCommande?.commercialBl) return
    setBlSaving(true)
    const result = await confirmCommercialBl(selectedCommande.commercialBl.id)
    setBlSaving(false)
    if (!result.success) {
      toast({ title: "Erreur", description: result.error, variant: "destructive" })
      return
    }
    updateSelectedCommercialBl(result.data.bl)
    toast({ title: "BC commercial confirmé", description: "Le BC est maintenant verrouillé." })
  }

  const handleRequestCommercialBlEdit = async () => {
    if (!selectedCommande?.commercialBl) return
    if (blActionMode !== "edit") {
      setBlActionMode("edit")
      return
    }
    if (!requestReason.trim()) {
      toast({ title: "Motif requis", description: "Indiquez pourquoi le BC doit être modifié.", variant: "destructive" })
      return
    }
    setBlSaving(true)
    const result = await requestCommercialBlEdit(selectedCommande.commercialBl.id, requestReason.trim())
    setBlSaving(false)
    if (!result.success) {
      toast({ title: "Erreur", description: result.error, variant: "destructive" })
      return
    }
    updateSelectedCommercialBl(result.data.bl)
    setRequestReason("")
    setBlActionMode(null)
    toast({ title: "Demande envoyée", description: "Le responsable commercial a été notifié." })
  }

  const handleCancelCommercialBl = async () => {
    if (!selectedCommande?.commercialBl) return
    if (blActionMode !== "cancel") {
      setBlActionMode("cancel")
      return
    }
    if (!cancelReason.trim()) {
      toast({ title: "Motif requis", description: "Indiquez pourquoi le BC doit être annulé.", variant: "destructive" })
      return
    }
    setBlSaving(true)
    const result = await cancelCommercialBl(selectedCommande.commercialBl.id, cancelReason.trim())
    setBlSaving(false)
    if (!result.success) {
      toast({ title: "Erreur", description: result.error, variant: "destructive" })
      return
    }
    updateSelectedCommercialBl(result.data.bl)
    setCancelReason("")
    setBlActionMode(null)
    toast({ title: "BC annulé", description: "La fiche client peut à nouveau être modifiée." })
  }
  const getCommercialBlBadge = (status?: string) => {
    switch (status) {
      case "BROUILLON":
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Brouillon</Badge>
      case "CONFIRME":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">En attente ADMIN</Badge>
      case "MODIFICATION_DEMANDEE":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Demande envoyée</Badge>
      case "MODIFICATION_AUTORISEE":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Modification autorisée</Badge>
      case "VALIDE_ADMIN":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Autorisé facturation</Badge>
      case "REJETE_ADMIN":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Rejeté</Badge>
      case "ANNULE":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Annulé</Badge>
      case "FACTURE":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Facturé</Badge>
      default:
        return <Badge variant="outline">En attente</Badge>
    }
  }

  const summary = useMemo(() => {
    const commandesEnPreparation = commandes.filter((commande) => commande.statut === "en_preparation").length
    const articlesCommandes = commandes.reduce(
      (total, commande) =>
        total + commande.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      0
    )
    return {
      totalCommandes: commandes.length,
      commandesEnPreparation,
      articlesCommandes,
    }
  }, [commandes])

  return (
    <div className="w-full space-y-2 bg-slate-50/70 p-2 md:space-y-3 md:p-4">
      <div className="rounded-2xl border bg-white p-2.5 shadow-sm md:p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/60">Suivi commercial</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold leading-tight text-slate-950 md:text-xl">Bons de commande</h1>
              <Badge className="rounded-full bg-primary/10 px-2 py-0.5 text-primary hover:bg-primary/10">
                {summary.totalCommandes} BC
              </Badge>
              <Badge variant="outline" className="rounded-full bg-white px-2 py-0.5">
                {summary.commandesEnPreparation} prépa.
              </Badge>
              <Badge variant="outline" className="rounded-full bg-white px-2 py-0.5">
                {summary.articlesCommandes} art.
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button onClick={() => openPersonalOrder()} size="sm" className="h-8 rounded-xl px-3">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nouveau BC
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={exporting} size="sm" className="hidden h-8 rounded-xl px-3 md:inline-flex">
              {exporting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
              Exporter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMobileFiltersOpen((current) => !current)}
              className="h-8 rounded-xl px-2.5 md:hidden"
            >
              Filtres
              <ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${isMobileFiltersOpen ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </div>

        <div className={`${isMobileFiltersOpen ? "grid" : "hidden"} mt-2 grid-cols-2 gap-1.5 md:grid lg:grid-cols-[minmax(260px,1fr)_150px_150px_auto] lg:items-center`}>
          <div className="relative col-span-2 lg:col-span-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 rounded-xl border-slate-200 bg-slate-50 pl-8 text-sm"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 justify-start rounded-xl border-slate-200 bg-slate-50 px-2 text-left text-xs font-normal sm:text-sm">
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Début"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 justify-start rounded-xl border-slate-200 bg-slate-50 px-2 text-left text-xs font-normal sm:text-sm">
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{dateTo ? format(dateTo, "dd/MM/yyyy") : "Fin"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
            </PopoverContent>
          </Popover>

          <div className="col-span-2 flex flex-wrap gap-1.5 lg:col-span-1">
            <Button onClick={handleSearch} size="sm" className="h-9 flex-1 rounded-xl px-3 lg:flex-none">
              <Search className="mr-1.5 h-3.5 w-3.5" />
              Rechercher
            </Button>
            <Button variant="ghost" onClick={clearFilters} size="sm" className="h-9 rounded-xl px-3">
              Effacer
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={exporting} size="sm" className="h-9 rounded-xl px-3 md:hidden">
              {exporting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
              Exporter
            </Button>
          </div>
        </div>
      </div>

      {/* Tableau des bons de commande */}
      <Card className="border-none shadow-md">
        <CardHeader className="px-3 pb-2 pt-3 md:px-6 md:pb-3 md:pt-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Bons de commande commerciaux
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {commandes.length} résultat{commandes.length > 1 ? "s" : ""}
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
          {loading ? (
            <div className="flex items-center justify-center rounded-2xl border border-dashed py-14">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Chargement des commandes...</span>
            </div>
          ) : commandes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-14 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="font-semibold text-slate-900">Aucune commande trouvée</h3>
              <p className="mt-1 text-sm text-muted-foreground">Essayez d’élargir la période ou de modifier la recherche.</p>
            </div>
          ) : (
            <>
            <div className="space-y-2 md:hidden">
              {commandes.map((commande) => (
                <button
                  key={commande.id}
                  type="button"
                  onClick={() => showCommandeDetails(commande)}
                  className="w-full rounded-xl border bg-white p-3 text-left shadow-sm transition hover:border-primary/30 hover:bg-primary-50/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{commande.clientName}</p>
                      <p className="truncate text-xs text-muted-foreground">{commande.parentName || commande.clientCode}</p>
                    </div>
                    {getCommercialBlBadge(commande.commercialBl?.status)}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono font-semibold text-slate-700">{commande.numeroCommande}</span>
                    <span>{format(new Date(commande.dateCommande), "dd/MM/yyyy", { locale: fr })}</span>
                    <Badge variant="outline" className="rounded-full text-[11px]">
                      {commande.items.length} produit{commande.items.length > 1 ? "s" : ""}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
            <div className="hidden overflow-hidden rounded-2xl border md:block">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-slate-50">
                    <TableHead>N° Commande</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Articles</TableHead>
                    <TableHead>BC commercial</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commandes.map((commande) => (
                    <TableRow key={commande.id} className="hover:bg-primary/5">
                      <TableCell>
                        <div className="font-mono text-sm font-semibold text-slate-900">
                          {commande.numeroCommande}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{commande.clientName}</div>
                            <div className="text-xs text-gray-500">{commande.parentName || commande.clientCode}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{format(new Date(commande.dateCommande), "dd/MM/yyyy", { locale: fr })}</div>
                          <div className="text-gray-500">{commande.heureCommande}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full">
                          {commande.items.length} produit{commande.items.length > 1 ? "s" : ""}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getCommercialBlBadge(commande.commercialBl?.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => showCommandeDetails(commande)}
                            className="flex items-center gap-1 rounded-full"
                          >
                            <Eye className="h-3 w-3" />
                            Voir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isPersonalOrderOpen} onOpenChange={setIsPersonalOrderOpen}>
        <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-2xl">
          <DialogHeader className="sticky top-0 z-10 border-b bg-white px-3 py-3 sm:static sm:border-b-0 sm:px-6 sm:pb-0 sm:pt-6">
            <DialogTitle className="text-base sm:text-lg">Créer un BC hors tournée</DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 pb-24 sm:space-y-4 sm:px-6 sm:pb-4">
            <div className="rounded-xl border bg-slate-50 p-2.5 sm:rounded-2xl sm:p-3">
              <label className="text-xs font-medium text-muted-foreground">Client</label>
              <Select value={selectedPersonalClientId} onValueChange={setSelectedPersonalClientId}>
                <SelectTrigger className="mt-1 h-10 rounded-xl bg-white">
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {personalClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">Créer un nouveau client</SelectItem>
                </SelectContent>
              </Select>

              {selectedPersonalClientId === "new" ? (
                <div className="mt-2 grid gap-2 sm:mt-3 sm:grid-cols-2 sm:gap-3">
                  <Input
                    placeholder="Nom du client"
                    value={personalClientForm.name}
                    onChange={(event) => setPersonalClientForm((current) => ({ ...current, name: event.target.value }))}
                    className="h-10 rounded-xl bg-white sm:col-span-2"
                  />
                  <Input
                    placeholder="Téléphone"
                    value={personalClientForm.phone}
                    onChange={(event) => setPersonalClientForm((current) => ({ ...current, phone: event.target.value }))}
                    className="h-10 rounded-xl bg-white"
                  />
                  <Input
                    placeholder="N° compte obligatoire"
                    value={personalClientForm.accountNumber}
                    onChange={(event) => setPersonalClientForm((current) => ({ ...current, accountNumber: event.target.value }))}
                    className="h-10 rounded-xl bg-white"
                  />
                </div>
              ) : (
                <p className="mt-1.5 text-[11px] text-muted-foreground sm:text-xs">
                  Le BC sera créé pour ce client de votre portefeuille personnel.
                </p>
              )}
            </div>

            <div className="rounded-xl border bg-white p-2.5 sm:rounded-2xl sm:p-3">
              <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
                <h3 className="text-sm font-semibold text-slate-900 sm:text-base">Produits</h3>
                <Button type="button" variant="outline" size="sm" onClick={addPersonalOrderLine} className="h-8 rounded-full px-2.5 text-xs sm:px-3">
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Ligne
                </Button>
              </div>
              <div className="space-y-2">
                {personalOrderLines.map((line, index) => (
                  <div key={index} className="grid grid-cols-[1fr_76px_42px] gap-1.5 rounded-xl border bg-slate-50 p-1.5 sm:grid-cols-[1fr_110px_auto] sm:gap-2 sm:p-2">
                    <Select
                      value={line.productId}
                      onValueChange={(value) => updatePersonalOrderLine(index, { productId: value })}
                    >
                      <SelectTrigger className="h-10 min-w-0 rounded-xl bg-white px-2 text-xs sm:px-3 sm:text-sm">
                        <SelectValue placeholder="Produit" />
                      </SelectTrigger>
                      <SelectContent>
                        {products
                          .filter((product) => {
                            const productId = String(product.id)
                            return productId === line.productId || !personalOrderLines.some((otherLine, lineIndex) => lineIndex !== index && otherLine.productId === productId)
                          })
                          .map((product) => (
                            <SelectItem key={product.id} value={String(product.id)}>
                              {product.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(event) => updatePersonalOrderLine(index, { quantity: event.target.value })}
                      className="h-10 rounded-xl bg-white px-2 text-center text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removePersonalOrderLine(index)}
                      disabled={personalOrderLines.length === 1}
                      className="h-10 rounded-xl border-red-200 px-0 text-red-700 hover:bg-red-50 hover:text-red-800 sm:px-3"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Commentaire</label>
              <Textarea
                value={personalOrderComment}
                onChange={(event) => setPersonalOrderComment(event.target.value)}
                placeholder="Commentaire optionnel"
                className="mt-1 min-h-16 rounded-xl sm:min-h-20"
              />
            </div>
          </div>
          <div className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-2 gap-2 border-t bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:flex sm:justify-end sm:border-t-0 sm:bg-transparent sm:px-6 sm:pb-6 sm:shadow-none">
            <Button variant="outline" onClick={() => setIsPersonalOrderOpen(false)} className="h-11 rounded-xl sm:h-10">
              Annuler
            </Button>
            <Button onClick={handleCreatePersonalOrder} disabled={personalSaving} className="h-11 rounded-xl sm:h-10">
              {personalSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Créer le BC
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de détails du bon de commande */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none bg-slate-50 p-0 sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl">
          <DialogHeader className="border-b bg-white px-3 py-3 sm:px-5 sm:py-4">
            <DialogTitle className="flex items-center gap-2 pr-8 text-base sm:text-lg">
              <FileText className="h-5 w-5 text-primary" />
              <span className="truncate">BC {selectedCommande?.numeroCommande}</span>
              {getCommercialBlBadge(selectedCommande?.commercialBl?.status)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCommande && (
            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 pb-24 sm:px-5 sm:py-4 sm:pb-5">
              <div className="rounded-xl border bg-white px-3 py-2 shadow-sm">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex max-w-full items-center gap-1.5 font-semibold text-slate-950 sm:max-w-56">
                    <User className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate">{selectedCommande.clientName}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 shrink-0" />
                    <span>{selectedCommande.clientCode || "-"}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{selectedCommande.clientPhone || "-"}</span>
                  </span>
                  <span className="hidden min-w-0 items-center gap-1.5 md:inline-flex">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{selectedCommande.clientAddress || "-"}</span>
                  </span>
                  <span className="ml-0 font-semibold text-slate-800 sm:ml-auto">
                    {format(new Date(selectedCommande.dateCommande), "dd/MM/yyyy", { locale: fr })}
                  </span>
                  <span className="font-semibold text-slate-800">{selectedCommande.heureCommande}</span>
                  <span className="font-semibold text-slate-800">{selectedCommande.parentName || "-"}</span>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                <div className="border-b bg-white px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-gray-900 sm:text-base">Articles</h3>
                    <Badge variant="outline" className="rounded-full text-[11px]">
                      {selectedCommande.items.length} produit{selectedCommande.items.length > 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>
                {canEditSelectedBl && (
                  <div className="grid gap-2 border-b bg-slate-50/70 p-2 sm:grid-cols-[1fr_90px_auto]">
                    <Select value={newBlProductId} onValueChange={setNewBlProductId}>
                      <SelectTrigger className="h-9 rounded-xl bg-white text-xs sm:text-sm">
                        <SelectValue placeholder="Ajouter un produit" />
                      </SelectTrigger>
                      <SelectContent>
                        {products
                          .filter((product) => !selectedCommande.items.some((item) => item.productId === product.id))
                          .map((product) => (
                            <SelectItem key={product.id} value={String(product.id)}>
                              {product.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      value={newBlProductQuantity}
                      onChange={(event) => setNewBlProductQuantity(event.target.value)}
                      className="h-9 rounded-xl bg-white text-center text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddCommercialBlProduct}
                      className="h-9 rounded-xl px-3 text-xs"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Ajouter
                    </Button>
                  </div>
                )}
                <div className="divide-y">
                  {selectedCommande.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{item.product}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{item.reference || "Sans référence"}</div>
                      </div>
                      {canEditSelectedBl ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min={1}
                            value={blQuantities[item.productId] || item.quantity}
                            onChange={(event) =>
                              setBlQuantities((current) => ({
                                ...current,
                                [item.productId]: event.target.value,
                              }))
                            }
                            className="h-9 w-20 shrink-0 rounded-xl text-right text-sm"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleRemoveCommercialBlProduct(item.productId)}
                            disabled={selectedCommande.items.length <= 1}
                            className="h-9 w-9 rounded-xl border-red-200 px-0 text-red-700 hover:bg-red-50 hover:text-red-800"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="outline" className="ml-auto shrink-0 rounded-full">Qté {item.quantity}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="min-w-0">
                  {selectedCommande.commercialBl?.confirmedAt && (
                    <span className="text-xs text-muted-foreground">
                      Confirmé le {format(new Date(selectedCommande.commercialBl.confirmedAt), "dd/MM/yyyy HH:mm", { locale: fr })}
                    </span>
                  )}
                    {isAuthorizedEditSelectedBl && (
                      <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                        Modification autorisée : ajustez les quantités puis enregistrez.
                      </div>
                    )}
                    {selectedCommande.commercialBl?.status === "REJETE_ADMIN" && selectedCommande.commercialBl.adminReviewComment && (
                      <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                        <div className="font-medium">Motif du rejet ADMIN</div>
                        <div>{selectedCommande.commercialBl.adminReviewComment}</div>
                      </div>
                    )}
                    {selectedCommande.commercialBl?.latestRequest && (
                      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                        <div className="font-medium">Dernière demande : {selectedCommande.commercialBl.latestRequest.status}</div>
                        <div className="text-muted-foreground">{selectedCommande.commercialBl.latestRequest.reason}</div>
                      </div>
                    )}
                    {canRequestEditSelectedBl && blActionMode === "edit" && (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          value={requestReason}
                          onChange={(event) => setRequestReason(event.target.value)}
                          placeholder="Motif de la demande de modification"
                          className="min-h-20 rounded-xl"
                        />
                      </div>
                    )}
                    {canCancelSelectedBl && blActionMode === "cancel" && (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={cancelReason}
                          onChange={(event) => setCancelReason(event.target.value)}
                          placeholder="Motif d’annulation obligatoire"
                          className="min-h-16 rounded-xl border-red-200 text-sm focus-visible:ring-red-200"
                        />
                      </div>
                    )}
                </div>

                <div className="hidden flex-wrap items-center justify-end gap-2 sm:flex">
                    {canEditSelectedBl && (
                      <Button
                        onClick={handleSaveCommercialBl}
                        disabled={blSaving}
                        aria-label="Enregistrer BC"
                        title="Enregistrer BC"
                        size="sm"
                        className="h-8 rounded-xl px-3 text-xs"
                      >
                        {blSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="mr-1.5 h-3.5 w-3.5" />}
                        Enregistrer
                      </Button>
                    )}
                    {canConfirmSelectedBl && (
                      <Button
                        variant="outline"
                        onClick={handleConfirmCommercialBl}
                        disabled={blSaving}
                        aria-label="Confirmer BC"
                        title="Confirmer BC"
                        size="sm"
                        className="h-8 rounded-xl px-3 text-xs"
                      >
                        {blSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="mr-1.5 h-3.5 w-3.5" />}
                        Confirmer
                      </Button>
                    )}
                    {canRequestEditSelectedBl && (
                      <Button variant="outline" size="sm" onClick={handleRequestCommercialBlEdit} disabled={blSaving} className="h-8 rounded-xl px-3 text-xs">
                        {blSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <AlertCircle className="mr-1.5 h-3.5 w-3.5" />}
                        {blActionMode === "edit" ? "Envoyer demande" : "Demander modif."}
                      </Button>
                    )}
                    {canCancelSelectedBl && (
                      <Button
                        variant="outline"
                        onClick={handleCancelCommercialBl}
                        disabled={blSaving}
                        aria-label="Annuler BC"
                        title="Annuler BC"
                        size="sm"
                        className="h-8 rounded-xl border-red-200 px-3 text-xs text-red-700 hover:bg-red-50 hover:text-red-800"
                      >
                        {blSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1.5 h-3.5 w-3.5" />}
                        {blActionMode === "cancel" ? "Confirmer annulation" : "Annuler"}
                      </Button>
                    )}
                </div>
              </div>

              <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
                <div className="flex gap-2">
                  {canEditSelectedBl && (
                    <Button
                      onClick={handleSaveCommercialBl}
                      disabled={blSaving}
                      aria-label="Enregistrer BC"
                      title="Enregistrer BC"
                      className="h-12 flex-1 rounded-xl"
                    >
                      {blSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                    </Button>
                  )}
                  {canConfirmSelectedBl && (
                    <Button
                      variant="outline"
                      onClick={handleConfirmCommercialBl}
                      disabled={blSaving}
                      aria-label="Confirmer BC"
                      title="Confirmer BC"
                      className="h-12 flex-1 rounded-xl"
                    >
                      {blSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                    </Button>
                  )}
                  {canRequestEditSelectedBl && (
                    <Button
                      variant="outline"
                      onClick={handleRequestCommercialBlEdit}
                      disabled={blSaving}
                      aria-label="Demander modification"
                      title="Demander modification"
                      className="h-12 flex-1 rounded-xl"
                    >
                      {blSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <AlertCircle className="h-5 w-5" />}
                    </Button>
                  )}
                  {canCancelSelectedBl && (
                    <Button
                      variant="outline"
                      onClick={handleCancelCommercialBl}
                      disabled={blSaving}
                      aria-label="Annuler BC"
                      title="Annuler BC"
                      className="h-12 flex-1 rounded-xl border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                    >
                      {blSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />}
                    </Button>
                  )}
                </div>
              </div>

              <div className="hidden rounded-xl border bg-white p-3 shadow-sm sm:block">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      {getStatutIcon(selectedCommande.statut)}
                      {getStatutBadge(selectedCommande.statut)}
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimer
                  </Button>
                </div>
              </div>

              {/* Commentaire */}
              {selectedCommande.commentaire && (
                <div className="hidden rounded-lg border border-blue-200 bg-blue-50 p-2 sm:block sm:p-4">
                  <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Commentaire
                  </h3>
                  <p className="text-sm">{selectedCommande.commentaire}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
