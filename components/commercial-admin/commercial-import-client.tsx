"use client"

import type { ReactNode } from "react"
import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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
  getCommercialClients,
  importCommercialClients,
  updateCommercialClient,
  updateCommercialLocation,
} from "@/actions/commercial-admin"
import { CommercialClient, CommercialClientLocation, CommercialClientType, CommercialImportRow } from "@/types/commercial"
import { Building2, FileSpreadsheet, MapPin, MoreHorizontal, Pencil, Plus, Store, Trash2, Upload } from "lucide-react"

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

export default function CommercialImportClient({ initialClients }: { initialClients: CommercialClient[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialTab = ["clients", "enseignes", "locaux"].includes(searchParams.get("tab") || "")
    ? searchParams.get("tab") || "clients"
    : "clients"
  const initialEnseigneId = Number(searchParams.get("enseigneId")) || null
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [clientDialogOpen, setClientDialogOpen] = useState(false)
  const [localDialogOpen, setLocalDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<CommercialClient | null>(null)
  const [editingLocation, setEditingLocation] = useState<CommercialClientLocation | null>(null)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [selectedEnseigneId, setSelectedEnseigneId] = useState<number | null>(initialEnseigneId)
  const [clients, setClients] = useState(initialClients)
  const [fileName, setFileName] = useState("")
  const [rows, setRows] = useState<CommercialImportRow[]>([])
  const [result, setResult] = useState<any>(null)
  const [clientForm, setClientForm] = useState(emptyClientForm)
  const [locationForm, setLocationForm] = useState(emptyLocationForm)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const refreshClients = async () => {
    setClients(await getCommercialClients({ includeInactive: true }))
  }

  const updateUrlState = (tab: string, enseigneId?: number | null) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)

    if (tab === "locaux" && enseigneId) {
      params.set("enseigneId", String(enseigneId))
    } else {
      params.delete("enseigneId")
    }

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const changeTab = (tab: string) => {
    setActiveTab(tab)
    if (tab !== "locaux") {
      setSelectedEnseigneId(null)
      updateUrlState(tab, null)
      return
    }

    updateUrlState(tab, selectedEnseigneId)
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
      commercialClientId: client ? String(client.id) : "",
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
      await refreshClients()
      setImportDialogOpen(false)
    })
  }

  const submitClient = () => {
    startTransition(async () => {
      const payload = {
        ...clientForm,
        type: editingClient?.type || clientForm.type,
        address: (editingClient?.type || clientForm.type) === "INDIVIDUEL" ? clientForm.address : "",
      }
      const result = editingClient
        ? await updateCommercialClient(editingClient.id, payload)
        : await createCommercialClient(payload)

      if (!result.success) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" })
        return
      }

      toast({ title: "Succès", description: editingClient ? "Client commercial modifié" : "Client commercial créé" })
      setClientForm(emptyClientForm)
      setEditingClient(null)
      await refreshClients()
      setClientDialogOpen(false)
    })
  }

  const deactivateClient = (client: CommercialClient) => {
    if (!window.confirm(`Désactiver ${client.name} ?`)) return

    startTransition(async () => {
      const result = await deactivateCommercialClient(client.id)
      if (!result.success) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" })
        return
      }

      toast({ title: "Succès", description: "Client commercial désactivé" })
      await refreshClients()
    })
  }

  const activateClient = (client: CommercialClient) => {
    startTransition(async () => {
      const result = await activateCommercialClient(client.id)
      if (!result.success) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" })
        return
      }

      toast({ title: "Succès", description: "Client commercial activé" })
      await refreshClients()
    })
  }

  const deactivateLocation = (location: CommercialClientLocation) => {
    if (!window.confirm(`Désactiver ${location.name} ?`)) return

    startTransition(async () => {
      const result = await deactivateCommercialLocation(location.id)
      if (!result.success) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" })
        return
      }

      toast({ title: "Succès", description: "Local désactivé" })
      await refreshClients()
    })
  }

  const activateLocation = (location: CommercialClientLocation) => {
    startTransition(async () => {
      const result = await activateCommercialLocation(location.id)
      if (!result.success) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" })
        return
      }

      toast({ title: "Succès", description: "Local activé" })
      await refreshClients()
    })
  }

  const submitLocation = () => {
    startTransition(async () => {
      const payload = {
        ...locationForm,
        commercialClientId: Number(locationForm.commercialClientId),
      }
      const result = editingLocation
        ? await updateCommercialLocation(editingLocation.id, payload)
        : await createCommercialLocation(payload)

      if (!result.success) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" })
        return
      }

      toast({ title: "Succès", description: editingLocation ? "Local modifié" : "Local ajouté" })
      setLocationForm(emptyLocationForm)
      setEditingLocation(null)
      await refreshClients()
      setLocalDialogOpen(false)
    })
  }

  const individualClients = clients.filter((client) => client.type === "INDIVIDUEL")
  const magasinClients = clients.filter((client) => client.type === "MAGASIN")
  const activeMagasinClients = magasinClients.filter((client) => client.isActive)
  const locationSelectableClients = editingLocation ? magasinClients : activeMagasinClients
  const allLocations = magasinClients.flatMap((client) =>
    (client.locations || []).map((location) => ({ client, location }))
  )
  const selectedEnseigne = selectedEnseigneId
    ? magasinClients.find((client) => client.id === selectedEnseigneId) || null
    : null
  const visibleLocations = selectedEnseigneId
    ? allLocations.filter(({ client }) => client.id === selectedEnseigneId)
    : allLocations

  const viewLocationsForClient = (client: CommercialClient) => {
    setSelectedEnseigneId(client.id)
    setActiveTab("locaux")
    updateUrlState("locaux", client.id)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <ActionCard
          title="Importer fichier"
          description="Importer un fichier Excel ou CSV."
          icon={<Upload className="h-5 w-5" />}
          onClick={() => setImportDialogOpen(true)}
        />
        <ActionCard
          title="Créer client / enseigne"
          description="Créer un client individuel ou une enseigne comme Auchan."
          icon={<Store className="h-5 w-5" />}
          onClick={() => startCreateClient()}
        />
        <ActionCard
          title="Créer local magasin"
          description="Ajouter un point de vente rattaché à une enseigne."
          icon={<MapPin className="h-5 w-5" />}
          onClick={() => startCreateLocation()}
        />
      </div>

      {result && (
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Dernier import</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Result label="Lignes" value={result.totalRows} />
            <Result label="Succès" value={result.successCount} />
            <Result label="Erreurs" value={result.errorCount} />
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={changeTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="clients">Clients ({individualClients.length})</TabsTrigger>
          <TabsTrigger value="enseignes">Enseignes ({magasinClients.length})</TabsTrigger>
          <TabsTrigger value="locaux">Locaux ({allLocations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Clients individuels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {individualClients.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <p className="font-medium">Aucun client individuel</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {individualClients.map((client) => (
                    <ClientRow
                      key={client.id}
                      client={client}
                      isPending={isPending}
                      onEdit={startEditClient}
                      onDeactivate={deactivateClient}
                      onActivate={activateClient}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enseignes">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Enseignes et locaux
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {magasinClients.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <p className="font-medium">Aucune enseigne créée</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {magasinClients.map((client) => (
                    <EnseigneCard
                      key={client.id}
                      client={client}
                      isPending={isPending}
                      onEdit={startEditClient}
                      onDeactivate={deactivateClient}
                      onActivate={activateClient}
                      onAddLocation={startCreateLocation}
                      onViewLocations={viewLocationsForClient}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locaux">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {selectedEnseigne ? `Locaux de ${selectedEnseigne.name}` : "Tous les locaux"}
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  {selectedEnseigne && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedEnseigneId(null)
                        updateUrlState("locaux", null)
                      }}
                    >
                      Voir tous les locaux
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => startCreateLocation(selectedEnseigne || undefined)}
                    disabled={!!selectedEnseigne && !selectedEnseigne.isActive}
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter local
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {visibleLocations.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <p className="font-medium">Aucun local trouvé</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Local</TableHead>
                        <TableHead>Enseigne</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleLocations.map(({ client, location }) => (
                        <TableRow key={location.id}>
                          <TableCell>
                            <div className="font-medium">{location.name}</div>
                            <div className="text-xs text-muted-foreground">{location.address || "Adresse non renseignée"}</div>
                          </TableCell>
                          <TableCell>{client.name}</TableCell>
                          <TableCell>
                            <div>{location.phone || "-"}</div>
                            {location.responsable && <div className="text-xs text-muted-foreground">{location.responsable}</div>}
                          </TableCell>
                          <TableCell>
                            <Badge variant={location.isActive ? "outline" : "destructive"}>
                              {location.isActive ? "Actif" : "Désactivé"}
                            </Badge>
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
                                  <DropdownMenuItem disabled={!client.isActive} onSelect={() => activateLocation(location)}>
                                    Activer
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Importer des clients commerciaux
            </DialogTitle>
            <DialogDescription>Importez les clients individuels, enseignes et locaux depuis Excel ou CSV.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed bg-primary-50/40 p-6">
              <Input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => onFileChange(event.target.files?.[0])} />
              <p className="mt-3 text-sm text-muted-foreground">
                Colonnes acceptées: nom/name, type, téléphone/phone, adresse/address, email, compte, contact,
                local/location, adresse local, téléphone local, responsable local.
              </p>
            </div>
            <Button onClick={submit} disabled={isPending || rows.length === 0}>
              Importer {rows.length > 0 ? `${rows.length} ligne(s)` : ""}
            </Button>
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

function Result({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

function ActionCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string
  description: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white">
        {icon}
      </span>
      <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </button>
  )
}

function ClientRow({
  client,
  isPending,
  onEdit,
  onDeactivate,
  onActivate,
}: {
  client: CommercialClient
  isPending: boolean
  onEdit: (client: CommercialClient) => void
  onDeactivate: (client: CommercialClient) => void
  onActivate: (client: CommercialClient) => void
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${client.isActive ? "bg-white" : "bg-red-50/40"}`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Store className={`h-4 w-4 ${client.isActive ? "text-primary" : "text-red-600"}`} />
            <span className="font-semibold text-gray-950">{client.name}</span>
            <Badge variant={client.isActive ? "outline" : "destructive"}>
              {client.isActive ? "Actif" : "Désactivé"}
            </Badge>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {[client.phone, client.address].filter(Boolean).join(" - ") || "Informations non renseignées"}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0" disabled={isPending}>
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(client)}>
              <Pencil className="h-4 w-4" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {client.isActive ? (
              <DropdownMenuItem className="text-red-600 focus:text-red-600" onSelect={() => onDeactivate(client)}>
                <Trash2 className="h-4 w-4" />
                Désactiver
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => onActivate(client)}>
                Activer
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

function EnseigneCard({
  client,
  isPending,
  onEdit,
  onDeactivate,
  onActivate,
  onAddLocation,
  onViewLocations,
}: {
  client: CommercialClient
  isPending: boolean
  onEdit: (client: CommercialClient) => void
  onDeactivate: (client: CommercialClient) => void
  onActivate: (client: CommercialClient) => void
  onAddLocation: (client: CommercialClient) => void
  onViewLocations: (client: CommercialClient) => void
}) {
  const locations = client.locations || []

  return (
    <div className={`rounded-lg border px-3 py-2 ${client.isActive ? "bg-white" : "bg-red-50/40"}`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <button type="button" onClick={() => onViewLocations(client)} className="min-w-0 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <Building2 className={`h-4 w-4 ${client.isActive ? "text-primary" : "text-red-600"}`} />
            <span className="font-semibold text-gray-950">{client.name}</span>
            <Badge variant={client.isActive ? "outline" : "destructive"}>
              {client.isActive ? "Actif" : "Désactivée"}
            </Badge>
            <Badge variant="outline">{locations.length} local(aux)</Badge>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{client.phone || "Téléphone non renseigné"}</div>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0" disabled={isPending}>
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onViewLocations(client)}>
              <MapPin className="h-4 w-4" />
              Voir ses locaux
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!client.isActive} onSelect={() => onAddLocation(client)}>
              <Plus className="h-4 w-4" />
              Ajouter un local
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(client)}>
              <Pencil className="h-4 w-4" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {client.isActive ? (
              <DropdownMenuItem className="text-red-600 focus:text-red-600" onSelect={() => onDeactivate(client)}>
                <Trash2 className="h-4 w-4" />
                Désactiver
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => onActivate(client)}>
                Activer
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
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
    <Card className="border-none shadow-md">
      <CardHeader>
        <CardTitle>Aperçu</CardTitle>
      </CardHeader>
      <CardContent>
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
                <TableCell>{row.phone || "-"}</TableCell>
                <TableCell>{row.locationName || "-"}</TableCell>
                <TableCell>{row.address || row.locationAddress || "-"}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Aucun fichier sélectionné
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
