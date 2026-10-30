"use client"

import type { ReactNode } from "react"
import { useEffect, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import * as XLSX from "xlsx"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  activateCommercialClient,
  activateCommercialLocation,
  createCommercialClient,
  createCommercialLocation,
  deactivateCommercialClient,
  deactivateCommercialLocation,
  importCommercialClients,
  updateCommercialClient,
  updateCommercialLocation,
} from "@/actions/commercial-admin"
import {
  CommercialClient,
  CommercialClientLocation,
  CommercialClientType,
  CommercialDirectoryCounts,
  CommercialImportRow,
  CommercialPaginationMeta,
} from "@/types/commercial"
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Store,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react"

const emptyClientForm = {
  name: "",
  type: "INDIVIDUEL" as CommercialClientType,
  phone: "",
  address: "",
  email: "",
  notes: "",
}

const emptyLocationForm = {
  commercialClientId: "",
  name: "",
  address: "",
  phone: "",
  responsable: "",
}

type ImportTab = "clients" | "enseignes" | "locaux"

type CommercialImportClientProps = {
  tab: ImportTab
  page: number
  pageSize: number
  q: string
  enseigneId: number | null
  clients: CommercialClient[]
  locations: CommercialClientLocation[]
  meta: CommercialPaginationMeta
  counts: CommercialDirectoryCounts
  enseignes: CommercialClient[]
}

export default function CommercialImportClient({
  tab,
  page,
  pageSize,
  q,
  enseigneId,
  clients,
  locations,
  meta,
  counts,
  enseignes,
}: CommercialImportClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [clientDialogOpen, setClientDialogOpen] = useState(false)
  const [localDialogOpen, setLocalDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<CommercialClient | null>(null)
  const [editingLocation, setEditingLocation] = useState<CommercialClientLocation | null>(null)
  const [searchInput, setSearchInput] = useState(q)
  const [fileName, setFileName] = useState("")
  const [rows, setRows] = useState<CommercialImportRow[]>([])
  const [result, setResult] = useState<any>(null)
  const [clientForm, setClientForm] = useState(emptyClientForm)
  const [locationForm, setLocationForm] = useState(emptyLocationForm)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  useEffect(() => {
    setSearchInput(q)
  }, [q])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const nextQuery = searchInput.trim()
      if (nextQuery === q) return
      updateUrl({ q: nextQuery, page: 1 })
    }, 350)

    return () => window.clearTimeout(handle)
  }, [searchInput])

  const updateUrl = (overrides: {
    tab?: ImportTab
    page?: number
    pageSize?: number
    q?: string
    enseigneId?: number | null
  }) => {
    const params = new URLSearchParams()
    const nextTab = overrides.tab ?? tab
    const nextPage = overrides.page ?? page
    const nextPageSize = overrides.pageSize ?? pageSize
    const nextQ = overrides.q !== undefined ? overrides.q : q
    const nextEnseigneId = overrides.enseigneId !== undefined ? overrides.enseigneId : enseigneId

    params.set("tab", nextTab)
    params.set("page", String(Math.max(nextPage, 1)))
    if (nextPageSize !== 10) {
      params.set("pageSize", String(nextPageSize))
    }
    if (nextQ.trim()) {
      params.set("q", nextQ.trim())
    }
    if (nextTab === "locaux" && nextEnseigneId) {
      params.set("enseigneId", String(nextEnseigneId))
    }

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const refresh = () => {
    router.refresh()
  }

  const startCreateClient = (type: CommercialClientType = "INDIVIDUEL") => {
    setEditingClient(null)
    setClientForm({ ...emptyClientForm, type })
    setClientDialogOpen(true)
  }

  const startEditClient = (client: CommercialClient) => {
    setEditingClient(client)
    setClientForm({
      name: client.name || "",
      type: client.type,
      phone: client.phone || "",
      address: client.type === "INDIVIDUEL" ? client.address || "" : "",
      email: client.email || "",
      notes: client.notes || "",
    })
    setClientDialogOpen(true)
  }

  const startCreateLocation = (client?: CommercialClient) => {
    setEditingLocation(null)
    setLocationForm({
      ...emptyLocationForm,
      commercialClientId: client ? String(client.id) : enseigneId ? String(enseigneId) : "",
    })
    setLocalDialogOpen(true)
  }

  const startEditLocation = (location: CommercialClientLocation) => {
    setEditingLocation(location)
    setLocationForm({
      commercialClientId: String(location.commercialClientId),
      name: location.name || "",
      address: location.address || "",
      phone: location.phone || "",
      responsable: location.responsable || "",
    })
    setLocalDialogOpen(true)
  }

  const onFileChange = async (file?: File) => {
    if (!file) return

    setFileName(file.name)
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" })
    const parsedRows = rawRows
      .map((row) => normalizeRow(row))
      .filter((row) => row.name)

    setRows(parsedRows)
    setResult(null)
  }

  const submit = () => {
    startTransition(async () => {
      const response: any = await importCommercialClients(fileName, rows)

      if (!response.success) {
        toast({ title: "Erreur", description: response.error, variant: "destructive" })
        return
      }

      setResult(response.data)
      toast({ title: "Import terminé", description: `${response.data?.successCount || 0} ligne(s) importée(s)` })
      setImportDialogOpen(false)
      refresh()
    })
  }

  const submitClient = () => {
    startTransition(async () => {
      const payload = {
        ...clientForm,
        type: editingClient?.type || clientForm.type,
        address: (editingClient?.type || clientForm.type) === "INDIVIDUEL" ? clientForm.address : "",
      }
      const mutationResult = editingClient
        ? await updateCommercialClient(editingClient.id, payload)
        : await createCommercialClient(payload)

      if (!mutationResult.success) {
        toast({ title: "Erreur", description: mutationResult.error, variant: "destructive" })
        return
      }

      toast({ title: "Succès", description: editingClient ? "Client commercial modifié" : "Client commercial créé" })
      setClientForm(emptyClientForm)
      setEditingClient(null)
      setClientDialogOpen(false)
      refresh()
    })
  }

  const deactivateClient = (client: CommercialClient) => {
    if (!window.confirm(`Désactiver ${client.name} ?`)) return

    startTransition(async () => {
      const mutationResult = await deactivateCommercialClient(client.id)
      if (!mutationResult.success) {
        toast({ title: "Erreur", description: mutationResult.error, variant: "destructive" })
        return
      }

      toast({ title: "Succès", description: "Client commercial désactivé" })
      refresh()
    })
  }

  const activateClient = (client: CommercialClient) => {
    startTransition(async () => {
      const mutationResult = await activateCommercialClient(client.id)
      if (!mutationResult.success) {
        toast({ title: "Erreur", description: mutationResult.error, variant: "destructive" })
        return
      }

      toast({ title: "Succès", description: "Client commercial activé" })
      refresh()
    })
  }

  const deactivateLocation = (location: CommercialClientLocation) => {
    if (!window.confirm(`Désactiver ${location.name} ?`)) return

    startTransition(async () => {
      const mutationResult = await deactivateCommercialLocation(location.id)
      if (!mutationResult.success) {
        toast({ title: "Erreur", description: mutationResult.error, variant: "destructive" })
        return
      }

      toast({ title: "Succès", description: "Local désactivé" })
      refresh()
    })
  }

  const activateLocation = (location: CommercialClientLocation) => {
    startTransition(async () => {
      const mutationResult = await activateCommercialLocation(location.id)
      if (!mutationResult.success) {
        toast({ title: "Erreur", description: mutationResult.error, variant: "destructive" })
        return
      }

      toast({ title: "Succès", description: "Local activé" })
      refresh()
    })
  }

  const submitLocation = () => {
    startTransition(async () => {
      const payload = {
        ...locationForm,
        commercialClientId: Number(locationForm.commercialClientId),
      }
      const mutationResult = editingLocation
        ? await updateCommercialLocation(editingLocation.id, payload)
        : await createCommercialLocation(payload)

      if (!mutationResult.success) {
        toast({ title: "Erreur", description: mutationResult.error, variant: "destructive" })
        return
      }

      toast({ title: "Succès", description: editingLocation ? "Local modifié" : "Local ajouté" })
      setLocationForm(emptyLocationForm)
      setEditingLocation(null)
      setLocalDialogOpen(false)
      refresh()
    })
  }

  const activeMagasinClients = enseignes.filter((client) => client.isActive)
  const locationSelectableClients = editingLocation ? enseignes : activeMagasinClients
  const selectedEnseigne = enseigneId
    ? enseignes.find((client) => client.id === enseigneId) || null
    : null

  const viewLocationsForClient = (client: CommercialClient) => {
    updateUrl({ tab: "locaux", enseigneId: client.id, page: 1, q: "" })
  }

  const searchPlaceholder =
    tab === "clients"
      ? "Rechercher un client…"
      : tab === "enseignes"
        ? "Rechercher une enseigne…"
        : "Rechercher un local…"

  const fromItem = meta.total === 0 ? 0 : (meta.currentPage - 1) * meta.perPage + 1
  const toItem = Math.min(meta.currentPage * meta.perPage, meta.total)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <StatChip icon={<Store className="h-3.5 w-3.5" />} label="Clients" value={counts.clients} />
          <StatChip icon={<Building2 className="h-3.5 w-3.5" />} label="Enseignes" value={counts.enseignes} />
          <StatChip icon={<MapPin className="h-3.5 w-3.5" />} label="Locaux" value={counts.locaux} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4" />
            Importer
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => startCreateClient()}>
            <Store className="h-4 w-4" />
            Client / enseigne
          </Button>
          <Button type="button" size="sm" className="gap-1.5" onClick={() => startCreateLocation()}>
            <Plus className="h-4 w-4" />
            Local
          </Button>
        </div>
      </div>

      {result && (
        <Card className="border-none shadow-sm">
          <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
            <Result label="Lignes" value={result.totalRows} />
            <Result label="Succès" value={result.successCount} tone="success" />
            <Result label="Erreurs" value={result.errorCount} tone="danger" />
          </CardContent>
        </Card>
      )}

      <Tabs
        value={tab}
        onValueChange={(value) => {
          const nextTab = value as ImportTab
          updateUrl({
            tab: nextTab,
            page: 1,
            q: "",
            enseigneId: nextTab === "locaux" ? enseigneId : null,
          })
          setSearchInput("")
        }}
        className="space-y-4"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1 lg:max-w-xl">
            <TabsTrigger value="clients" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Store className="hidden h-3.5 w-3.5 sm:block" />
              Clients
              <CountBadge count={counts.clients} active={tab === "clients"} />
            </TabsTrigger>
            <TabsTrigger value="enseignes" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Building2 className="hidden h-3.5 w-3.5 sm:block" />
              Enseignes
              <CountBadge count={counts.enseignes} active={tab === "enseignes"} />
            </TabsTrigger>
            <TabsTrigger value="locaux" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MapPin className="hidden h-3.5 w-3.5 sm:block" />
              Locaux
              <CountBadge count={counts.locaux} active={tab === "locaux"} />
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="clients" className="mt-0">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="h-4 w-4 text-primary" />
                Clients individuels
              </CardTitle>
              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => startCreateClient("INDIVIDUEL")}>
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {clients.length === 0 ? (
                <EmptyState
                  icon={<Store className="h-8 w-8 text-muted-foreground" />}
                  title={q ? "Aucun client trouvé" : "Aucun client individuel"}
                  description={
                    q
                      ? "Essayez un autre terme de recherche."
                      : "Créez un client manuellement ou importez un fichier Excel / CSV."
                  }
                  action={
                    !q ? (
                      <Button type="button" size="sm" className="gap-1.5" onClick={() => startCreateClient("INDIVIDUEL")}>
                        <Plus className="h-4 w-4" />
                        Créer un client
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead>Client</TableHead>
                        <TableHead className="hidden md:table-cell">Téléphone</TableHead>
                        <TableHead className="hidden lg:table-cell">Adresse</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((client) => (
                        <TableRow key={client.id} className={!client.isActive ? "bg-red-50/40" : undefined}>
                          <TableCell>
                            <div className="font-medium text-gray-950">{client.name}</div>
                            {(client.email || client.accountNumber) && (
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {[client.accountNumber, client.email].filter(Boolean).join(" · ")}
                              </div>
                            )}
                            <div className="mt-1 space-y-0.5 text-xs text-muted-foreground md:hidden">
                              {client.phone && <div>{client.phone}</div>}
                              {client.address && <div>{client.address}</div>}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{client.phone || "—"}</TableCell>
                          <TableCell className="hidden max-w-[220px] truncate lg:table-cell">
                            {client.address || "—"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge active={client.isActive} />
                          </TableCell>
                          <TableCell className="text-right">
                            <RowActions
                              isPending={isPending}
                              isActive={client.isActive}
                              onEdit={() => startEditClient(client)}
                              onDeactivate={() => deactivateClient(client)}
                              onActivate={() => activateClient(client)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <ListPagination
                fromItem={fromItem}
                toItem={toItem}
                total={meta.total}
                page={meta.currentPage}
                lastPage={meta.lastPage}
                pageSize={pageSize}
                onPageChange={(nextPage) => updateUrl({ page: nextPage })}
                onPageSizeChange={(nextSize) => updateUrl({ pageSize: nextSize, page: 1 })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enseignes" className="mt-0">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-primary" />
                Enseignes
              </CardTitle>
              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => startCreateClient("MAGASIN")}>
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {clients.length === 0 ? (
                <EmptyState
                  icon={<Building2 className="h-8 w-8 text-muted-foreground" />}
                  title={q ? "Aucune enseigne trouvée" : "Aucune enseigne créée"}
                  description={
                    q
                      ? "Essayez un autre terme de recherche."
                      : "Créez d'abord une enseigne (ex. Auchan), puis ajoutez ses locaux."
                  }
                  action={
                    !q ? (
                      <Button type="button" size="sm" className="gap-1.5" onClick={() => startCreateClient("MAGASIN")}>
                        <Plus className="h-4 w-4" />
                        Créer une enseigne
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead>Enseigne</TableHead>
                        <TableHead className="hidden md:table-cell">Contact</TableHead>
                        <TableHead>Locaux</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((client) => {
                        const clientLocations = client.locations || []
                        return (
                          <TableRow key={client.id} className={!client.isActive ? "bg-red-50/40" : undefined}>
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => viewLocationsForClient(client)}
                                className="text-left transition hover:text-primary"
                              >
                                <div className="font-medium text-gray-950">{client.name}</div>
                                {client.email && (
                                  <div className="mt-0.5 text-xs text-muted-foreground">{client.email}</div>
                                )}
                              </button>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{client.phone || "—"}</TableCell>
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => viewLocationsForClient(client)}
                                className="inline-flex"
                              >
                                <Badge variant="secondary" className="cursor-pointer hover:bg-primary/10">
                                  {clientLocations.length} local{clientLocations.length !== 1 ? "aux" : ""}
                                </Badge>
                              </button>
                            </TableCell>
                            <TableCell>
                              <StatusBadge active={client.isActive} inactiveLabel="Désactivée" />
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0" disabled={isPending}>
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onSelect={() => viewLocationsForClient(client)}>
                                    <MapPin className="h-4 w-4" />
                                    Voir ses locaux
                                  </DropdownMenuItem>
                                  <DropdownMenuItem disabled={!client.isActive} onSelect={() => startCreateLocation(client)}>
                                    <Plus className="h-4 w-4" />
                                    Ajouter un local
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => startEditClient(client)}>
                                    <Pencil className="h-4 w-4" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {client.isActive ? (
                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onSelect={() => deactivateClient(client)}>
                                      <Trash2 className="h-4 w-4" />
                                      Désactiver
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onSelect={() => activateClient(client)}>
                                      Activer
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              <ListPagination
                fromItem={fromItem}
                toItem={toItem}
                total={meta.total}
                page={meta.currentPage}
                lastPage={meta.lastPage}
                pageSize={pageSize}
                onPageChange={(nextPage) => updateUrl({ page: nextPage })}
                onPageSizeChange={(nextSize) => updateUrl({ pageSize: nextSize, page: 1 })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locaux" className="mt-0">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-primary" />
                  {selectedEnseigne ? `Locaux de ${selectedEnseigne.name}` : "Tous les locaux"}
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  {selectedEnseigne && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => updateUrl({ enseigneId: null, page: 1 })}
                    >
                      Voir tous
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => startCreateLocation(selectedEnseigne || undefined)}
                    disabled={!!selectedEnseigne && !selectedEnseigne.isActive}
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter local
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {locations.length === 0 ? (
                <EmptyState
                  icon={<MapPin className="h-8 w-8 text-muted-foreground" />}
                  title={q ? "Aucun local trouvé" : "Aucun local"}
                  description={
                    q
                      ? "Essayez un autre terme de recherche."
                      : selectedEnseigne
                        ? `Ajoutez un point de vente rattaché à ${selectedEnseigne.name}.`
                        : "Ajoutez un point de vente rattaché à une enseigne."
                  }
                  action={
                    !q ? (
                      <Button
                        type="button"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => startCreateLocation(selectedEnseigne || undefined)}
                        disabled={!!selectedEnseigne && !selectedEnseigne.isActive}
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter un local
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead>Local</TableHead>
                        <TableHead className="hidden sm:table-cell">Enseigne</TableHead>
                        <TableHead className="hidden md:table-cell">Contact</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locations.map((location) => {
                        const client = location.client
                        return (
                          <TableRow key={location.id} className={!location.isActive ? "bg-red-50/40" : undefined}>
                            <TableCell>
                              <div className="font-medium">{location.name}</div>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {location.address || "Adresse non renseignée"}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground sm:hidden">{client?.name}</div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">{client?.name || "—"}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div>{location.phone || "—"}</div>
                              {location.responsable && (
                                <div className="text-xs text-muted-foreground">{location.responsable}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusBadge active={location.isActive} />
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0" disabled={isPending}>
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onSelect={() => startEditLocation(location)}>
                                    <Pencil className="h-4 w-4" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {location.isActive ? (
                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onSelect={() => deactivateLocation(location)}>
                                      <Trash2 className="h-4 w-4" />
                                      Désactiver
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem disabled={client?.isActive === false} onSelect={() => activateLocation(location)}>
                                      Activer
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              <ListPagination
                fromItem={fromItem}
                toItem={toItem}
                total={meta.total}
                page={meta.currentPage}
                lastPage={meta.lastPage}
                pageSize={pageSize}
                onPageChange={(nextPage) => updateUrl({ page: nextPage })}
                onPageSizeChange={(nextSize) => updateUrl({ pageSize: nextSize, page: 1 })}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          setImportDialogOpen(open)
          if (!open) {
            setFileName("")
            setRows([])
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Importer des clients commerciaux
            </DialogTitle>
            <DialogDescription>Importez les clients individuels, enseignes et locaux depuis Excel ou CSV.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/25 bg-primary/5 px-6 py-8 text-center transition hover:border-primary/50 hover:bg-primary/10">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium text-gray-900">
                  {fileName || "Glissez un fichier ou cliquez pour parcourir"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Formats acceptés : .xlsx, .xls, .csv</p>
              </div>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) => onFileChange(event.target.files?.[0])}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Colonnes acceptées : nom/name, type, téléphone/phone, adresse/address, email, compte, contact,
              local/location, adresse local, téléphone local, responsable local.
            </p>
            {rows.length > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{rows.length}</span> ligne(s) prête(s) à importer
                  {fileName ? ` depuis ${fileName}` : ""}
                </span>
                <Button onClick={submit} disabled={isPending} size="sm" className="gap-1.5">
                  <Upload className="h-4 w-4" />
                  Importer
                </Button>
              </div>
            )}
            <PreviewTable rows={rows} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={clientDialogOpen}
        onOpenChange={(open) => {
          setClientDialogOpen(open)
          if (!open) {
            setEditingClient(null)
            setClientForm(emptyClientForm)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              {editingClient ? "Modifier le client ou l'enseigne" : "Créer un client ou une enseigne"}
            </DialogTitle>
            <DialogDescription>
              {editingClient
                ? "Mettez à jour les informations du client commercial."
                : "Pour créer une enseigne comme Auchan, choisissez le type Magasin / enseigne."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800 md:col-span-2">
              Une enseigne est le magasin parent, par exemple <strong>Auchan</strong>. Si vous voulez créer
              <strong> Auchan Liberté 6</strong>, créez d'abord l'enseigne <strong>Auchan</strong>, puis ajoutez le local.
            </div>
            <Field label="Nom" value={clientForm.name} onChange={(value) => setClientForm({ ...clientForm, name: value })} />
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={clientForm.type}
                onValueChange={(value: CommercialClientType) => setClientForm({ ...clientForm, type: value })}
                disabled={!!editingClient}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDIVIDUEL">Client individuel</SelectItem>
                  <SelectItem value="MAGASIN">Magasin / enseigne</SelectItem>
                </SelectContent>
              </Select>
              {editingClient && (
                <p className="text-xs text-muted-foreground">
                  Le type ne peut plus être modifié après la création.
                </p>
              )}
            </div>
            <Field label="Téléphone" value={clientForm.phone} onChange={(value) => setClientForm({ ...clientForm, phone: value })} />
            {clientForm.type === "INDIVIDUEL" && (
              <Field label="Adresse" value={clientForm.address} onChange={(value) => setClientForm({ ...clientForm, address: value })} />
            )}
            <Field label="Email" value={clientForm.email} onChange={(value) => setClientForm({ ...clientForm, email: value })} />
            <div className="space-y-1 md:col-span-2">
              <Label>Notes (facultatif)</Label>
              <Textarea value={clientForm.notes} onChange={(event) => setClientForm({ ...clientForm, notes: event.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Button onClick={submitClient} disabled={isPending || !clientForm.name} className="gap-2">
                {editingClient ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingClient ? "Modifier" : "Créer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={localDialogOpen}
        onOpenChange={(open) => {
          setLocalDialogOpen(open)
          if (!open) {
            setEditingLocation(null)
            setLocationForm(emptyLocationForm)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {editingLocation ? "Modifier le local de magasin" : "Créer un local de magasin"}
            </DialogTitle>
            <DialogDescription>
              {editingLocation
                ? "Mettez à jour les informations du point de vente."
                : "Le local doit être rattaché à une enseigne existante."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
              Exemple: choisissez <strong>Auchan</strong>, puis saisissez <strong>Liberté 6</strong> comme nom du local.
              {activeMagasinClients.length === 0 && (
                <div className="mt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setLocalDialogOpen(false)
                      startCreateClient("MAGASIN")
                    }}
                  >
                    Créer d'abord une enseigne
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Enseigne</Label>
              <Select
                value={locationForm.commercialClientId}
                onValueChange={(value) => setLocationForm({ ...locationForm, commercialClientId: value })}
                disabled={!!editingLocation}
              >
                <SelectTrigger><SelectValue placeholder="Choisir une enseigne existante" /></SelectTrigger>
                <SelectContent>
                  {locationSelectableClients.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingLocation && (
                <p className="text-xs text-muted-foreground">
                  L'enseigne du local ne peut pas être modifiée après création.
                </p>
              )}
            </div>
            <Field label="Nom du local" value={locationForm.name} onChange={(value) => setLocationForm({ ...locationForm, name: value })} />
            <Field label="Adresse" value={locationForm.address} onChange={(value) => setLocationForm({ ...locationForm, address: value })} />
            <Field label="Téléphone" value={locationForm.phone} onChange={(value) => setLocationForm({ ...locationForm, phone: value })} />
            <Field label="Responsable" value={locationForm.responsable} onChange={(value) => setLocationForm({ ...locationForm, responsable: value })} />
            <Button onClick={submitLocation} disabled={isPending || !locationForm.commercialClientId || !locationForm.name} className="w-full gap-2">
              {editingLocation ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingLocation ? "Modifier le local" : "Ajouter le local"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function normalizeRow(row: Record<string, any>): CommercialImportRow {
  const get = (...keys: string[]) => {
    const foundKey = keys.find((key) => row[key] !== undefined && row[key] !== "")
    return foundKey ? String(row[foundKey]).trim() : ""
  }

  const rawType = get("type", "Type").toUpperCase()

  return {
    name: get("name", "nom", "Nom", "client", "Client"),
    type: rawType === "MAGASIN" ? "MAGASIN" : "INDIVIDUEL",
    phone: get("phone", "telephone", "téléphone", "Téléphone"),
    address: get("address", "adresse", "Adresse"),
    email: get("email", "Email"),
    accountNumber: get("accountNumber", "compte", "Compte", "code client"),
    contactName: get("contact", "responsable", "Responsable"),
    notes: get("notes", "Notes"),
    locationName: get("locationName", "local", "Local", "point de vente"),
    locationAddress: get("locationAddress", "adresse local", "Adresse local"),
    locationPhone: get("locationPhone", "telephone local", "Téléphone local"),
    locationResponsable: get("locationResponsable", "responsable local", "Responsable local"),
  }
}

function StatChip({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm">
      <span className="text-primary">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  )
}

function CountBadge({ count, active }: { count: number; active: boolean }) {
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
        active ? "bg-white/20 text-primary-foreground" : "bg-background text-foreground"
      }`}
    >
      {count}
    </span>
  )
}

function StatusBadge({ active, inactiveLabel = "Désactivé" }: { active: boolean; inactiveLabel?: string }) {
  return (
    <Badge variant={active ? "outline" : "destructive"} className="gap-1 font-normal">
      {active ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <XCircle className="h-3 w-3" />}
      {active ? "Actif" : inactiveLabel}
    </Badge>
  )
}

function Result({ label, value, tone }: { label: string; value: number; tone?: "success" | "danger" }) {
  const toneClass =
    tone === "success"
      ? "border-emerald-100 bg-emerald-50"
      : tone === "danger"
        ? "border-red-100 bg-red-50"
        : "bg-muted/30"

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-10 text-center">
      {icon}
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

function ListPagination({
  fromItem,
  toItem,
  total,
  page,
  lastPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  fromItem: number
  toItem: number
  total: number
  page: number
  lastPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}) {
  if (total === 0) return null

  return (
    <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {fromItem}–{toItem} sur {total}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger className="h-8 w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 / page</SelectItem>
            <SelectItem value="20">20 / page</SelectItem>
            <SelectItem value="50">50 / page</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Page précédente</span>
          </Button>
          <span className="min-w-[4.5rem] text-center text-sm tabular-nums">
            {page} / {lastPage}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            disabled={page >= lastPage}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Page suivante</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

function RowActions({
  isPending,
  isActive,
  onEdit,
  onDeactivate,
  onActivate,
}: {
  isPending: boolean
  isActive: boolean
  onEdit: () => void
  onDeactivate: () => void
  onActivate: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0" disabled={isPending}>
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="h-4 w-4" />
          Modifier
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isActive ? (
          <DropdownMenuItem className="text-red-600 focus:text-red-600" onSelect={onDeactivate}>
            <Trash2 className="h-4 w-4" />
            Désactiver
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={onActivate}>
            Activer
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function PreviewTable({ rows }: { rows: CommercialImportRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="border-b bg-muted/40 px-3 py-2 text-sm font-medium">
        Aperçu {rows.length > 0 ? `(${Math.min(rows.length, 20)} premières lignes)` : ""}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Téléphone</TableHead>
            <TableHead>Local</TableHead>
            <TableHead>Adresse</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(0, 20).map((row, index) => (
            <TableRow key={`${row.name}-${index}`}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.type}</TableCell>
              <TableCell>{row.phone || "—"}</TableCell>
              <TableCell>{row.locationName || "—"}</TableCell>
              <TableCell>{row.address || row.locationAddress || "—"}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                Sélectionnez un fichier pour prévisualiser les données
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
