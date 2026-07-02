"use client"

import { type ReactNode, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  BriefcaseBusiness,
  Building2,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  type Table as TanStackTable,
  useReactTable,
} from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  createPersonalClient,
  deactivatePersonalClient,
  getAssignedPortfolio,
  getPersonalClients,
  updatePersonalClient,
  type AssignedPortfolioClient,
  type PersonalClient,
  type PersonalClientInput,
} from "@/actions/portfolio-actions"
import { queryKeys } from "@/lib/query-keys"

type PersonalClientForm = {
  name: string
  phone: string
  accountNumber: string
}

const emptyForm: PersonalClientForm = {
  name: "",
  phone: "",
  accountNumber: "",
}

const formToPayload = (form: PersonalClientForm): PersonalClientInput => ({
  name: form.name.trim(),
  phone: form.phone.trim(),
  accountNumber: form.accountNumber.trim(),
})

function normalize(value?: string | null) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function PortfolioTable<TData>({
  table,
  isLoading,
  emptyMessage,
  renderMobileRow,
}: {
  table: TanStackTable<TData>
  isLoading: boolean
  emptyMessage: string
  renderMobileRow?: (item: TData) => ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Chargement...
        </div>
      ) : table.getRowModel().rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</div>
      ) : (
        <>
          {renderMobileRow && (
            <div className="space-y-1.5 p-2 md:hidden">
              {table.getRowModel().rows.map((row) => (
                <div key={row.id}>{renderMobileRow(row.original)}</div>
              ))}
            </div>
          )}
          <div className={renderMobileRow ? "hidden overflow-x-auto md:block" : "overflow-x-auto"}>
            <Table>
              <TableHeader className="bg-slate-50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-slate-50">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="h-9 whitespace-nowrap px-3 text-xs">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-primary/5">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-3 py-2 text-xs">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between gap-2 border-t bg-slate-50/70 px-2 py-2 text-xs sm:px-3">
            <span className="text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-7 rounded-lg px-2 text-xs"
              >
                Préc.
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-7 rounded-lg px-2 text-xs"
              >
                Suiv.
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function PortefeuilleClient() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<PersonalClient | null>(null)
  const [form, setForm] = useState<PersonalClientForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const { data: assignedPortfolio = [], isLoading: assignedLoading } = useQuery({
    queryKey: ["assigned-portfolio"],
    queryFn: () => getAssignedPortfolio(),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  const { data: personalClients = [], isLoading: personalLoading } = useQuery({
    queryKey: queryKeys.personalClients(),
    queryFn: () => getPersonalClients(),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  const filteredAssigned = useMemo(() => {
    const term = normalize(search)
    if (!term) return assignedPortfolio
    return assignedPortfolio.filter((client) =>
      [client.name, client.parentName, client.phone, client.address, client.accountNumber, client.note]
        .some((value) => normalize(value).includes(term))
    )
  }, [assignedPortfolio, search])

  const filteredPersonal = useMemo(() => {
    const term = normalize(search)
    if (!term) return personalClients
    return personalClients.filter((client) =>
      [client.name, client.phone, client.accountNumber]
        .some((value) => normalize(value).includes(term))
    )
  }, [personalClients, search])

  const assignedColumns = useMemo<ColumnDef<AssignedPortfolioClient>[]>(
    () => [
      {
        header: "Client",
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="min-w-40">
            <p className="font-semibold text-slate-950">{row.original.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {row.original.parentName || (row.original.type === "MAGASIN" ? "Magasin" : "Client individuel")}
            </p>
          </div>
        ),
      },
      {
        header: "Compte",
        accessorKey: "accountNumber",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-slate-700">
            {row.original.accountNumber || "-"}
          </span>
        ),
      },
      {
        header: "Téléphone",
        accessorKey: "phone",
        cell: ({ row }) => <span className="whitespace-nowrap">{row.original.phone || "-"}</span>,
      },
      {
        header: "Adresse",
        accessorKey: "address",
        cell: ({ row }) => (
          <span className="block max-w-56 truncate" title={row.original.address || undefined}>
            {row.original.address || "-"}
          </span>
        ),
      },
      {
        header: "Note",
        accessorKey: "note",
        cell: ({ row }) => (
          <span className="block max-w-52 truncate text-muted-foreground" title={row.original.note || undefined}>
            {row.original.note || "-"}
          </span>
        ),
      },
      {
        header: "Date",
        accessorKey: "assignedAt",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {format(new Date(row.original.assignedAt), "dd/MM/yyyy", { locale: fr })}
          </span>
        ),
      },
      {
        header: "Type",
        accessorKey: "source",
        cell: () => (
          <Badge className="h-5 rounded-full bg-blue-100 px-2 text-[10px] text-blue-700 hover:bg-blue-100">
            ADMIN
          </Badge>
        ),
      },
    ],
    []
  )

  const personalColumns = useMemo<ColumnDef<PersonalClient>[]>(
    () => [
      {
        header: "Client",
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="min-w-40">
            <p className="font-semibold text-slate-950">{row.original.name}</p>
            <p className="text-[11px] text-muted-foreground">Client personnel</p>
          </div>
        ),
      },
      {
        header: "Compte",
        accessorKey: "accountNumber",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-slate-700">
            {row.original.accountNumber || "-"}
          </span>
        ),
      },
      {
        header: "Téléphone",
        accessorKey: "phone",
        cell: ({ row }) => <span className="whitespace-nowrap">{row.original.phone || "-"}</span>,
      },
      {
        header: "Statut",
        accessorKey: "isActive",
        cell: () => (
          <Badge className="h-5 rounded-full bg-emerald-100 px-2 text-[10px] text-emerald-700 hover:bg-emerald-100">
            Perso
          </Badge>
        ),
      },
      {
        header: () => <span className="block text-right">Actions</span>,
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="outline" onClick={() => openForm(row.original)} className="h-7 rounded-lg px-2 text-xs">
              <Pencil className="mr-1 h-3 w-3" />
              Modif.
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDeactivate(row.original)}
              disabled={saving}
              className="h-7 rounded-lg border-red-200 px-2 text-xs text-red-700 hover:bg-red-50 hover:text-red-800"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Retirer
            </Button>
          </div>
        ),
      },
    ],
    [saving]
  )

  const assignedTable = useReactTable({
    data: filteredAssigned,
    columns: assignedColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  const personalTable = useReactTable({
    data: filteredPersonal,
    columns: personalColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  const openForm = (client?: PersonalClient) => {
    setEditingClient(client || null)
    setForm(client ? {
      name: client.name || "",
      phone: client.phone || "",
      accountNumber: client.accountNumber || "",
    } : emptyForm)
    setIsFormOpen(true)
  }

  const validateForm = () => {
    if (!form.name.trim()) {
      toast({ title: "Nom requis", description: "Renseignez le nom du client.", variant: "destructive" })
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

  const refreshPersonal = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.personalClients() })
    queryClient.invalidateQueries({ queryKey: ["commercial-orders"] })
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setSaving(true)
    const payload = formToPayload(form)
    const result = editingClient
      ? await updatePersonalClient(editingClient.id, payload)
      : await createPersonalClient(payload)
    setSaving(false)

    if (!result.success) {
      toast({ title: "Erreur", description: result.error, variant: "destructive" })
      return
    }

    toast({ title: editingClient ? "Client modifié" : "Client ajouté", description: "Votre portefeuille personnel est à jour." })
    setIsFormOpen(false)
    setEditingClient(null)
    setForm(emptyForm)
    refreshPersonal()
  }

  const handleDeactivate = async (client: PersonalClient) => {
    setSaving(true)
    const result = await deactivatePersonalClient(client.id)
    setSaving(false)

    if (!result.success) {
      toast({ title: "Erreur", description: result.error, variant: "destructive" })
      return
    }

    toast({ title: "Client désactivé", description: `${client.name} est retiré de votre portefeuille personnel actif.` })
    refreshPersonal()
  }

  const renderAssignedMobileRow = (client: AssignedPortfolioClient) => (
    <div className="rounded-lg border bg-white p-2 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{client.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {client.parentName || (client.type === "MAGASIN" ? "Magasin" : "Client individuel")}
          </p>
        </div>
        <Badge className="h-5 shrink-0 rounded-full bg-blue-100 px-2 text-[10px] text-blue-700 hover:bg-blue-100">
          ADMIN
        </Badge>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        <span className="truncate">Compte: {client.accountNumber || "-"}</span>
        <span className="truncate">Tél: {client.phone || "-"}</span>
      </div>
    </div>
  )

  const renderPersonalMobileRow = (client: PersonalClient) => (
    <div className="rounded-lg border bg-white p-2 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{client.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">Client personnel</p>
        </div>
        <Badge className="h-5 shrink-0 rounded-full bg-emerald-100 px-2 text-[10px] text-emerald-700 hover:bg-emerald-100">
          Perso
        </Badge>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        <span className="truncate">Compte: {client.accountNumber || "-"}</span>
        <span className="truncate">Tél: {client.phone || "-"}</span>
        <span className="col-span-2 truncate">Adr: {client.address || "-"}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <Button size="sm" variant="outline" onClick={() => openForm(client)} className="h-7 rounded-lg px-2 text-xs">
          <Pencil className="mr-1 h-3 w-3" />
          Modif.
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleDeactivate(client)}
          disabled={saving}
          className="h-7 rounded-lg border-red-200 px-2 text-xs text-red-700 hover:bg-red-50 hover:text-red-800"
        >
          <Trash2 className="mr-1 h-3 w-3" />
          Retirer
        </Button>
      </div>
    </div>
  )

  return (
    <div className="w-full space-y-2 bg-slate-50/70 p-1.5 md:p-3">
      <Card className="border-none shadow-sm">
        <CardContent className="p-2 md:p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="flex min-w-0 items-center gap-2 lg:w-60">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary md:h-9 md:w-9">
                <BriefcaseBusiness className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/60">Commercial</p>
                <h1 className="truncate text-base font-bold text-slate-950 md:text-lg">Portefeuille</h1>
              </div>
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher client, téléphone, compte..."
                className="h-9 rounded-xl bg-slate-50 pl-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-1 lg:w-72">
              <div className="rounded-lg border bg-white px-2 py-1">
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-sm font-bold">{assignedPortfolio.length + personalClients.length}</p>
              </div>
              <div className="rounded-lg border bg-white px-2 py-1">
                <p className="text-[10px] text-muted-foreground">ADMIN</p>
                <p className="text-sm font-bold">{assignedPortfolio.length}</p>
              </div>
              <div className="rounded-lg border bg-white px-2 py-1">
                <p className="text-[10px] text-muted-foreground">Perso.</p>
                <p className="text-sm font-bold">{personalClients.length}</p>
              </div>
            </div>

            <Button onClick={() => openForm()} size="sm" className="h-8 rounded-xl md:h-9 lg:w-auto">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="admin" className="space-y-2">
        <TabsList className="grid h-9 w-full grid-cols-2 rounded-xl bg-white p-1 shadow-sm">
          <TabsTrigger value="admin" className="h-7 rounded-lg text-xs">
            ADMIN ({filteredAssigned.length})
          </TabsTrigger>
          <TabsTrigger value="personal" className="h-7 rounded-lg text-xs">
            Personnel ({filteredPersonal.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admin" className="mt-0">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex-row items-center justify-between space-y-0 p-2.5 md:p-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-blue-600" />
                Portefeuille attribué par l’ADMIN
              </CardTitle>
              <Badge variant="outline" className="rounded-full text-[10px]">Lecture seule</Badge>
            </CardHeader>
            <CardContent className="p-2.5 pt-0 md:p-3 md:pt-0">
              <PortfolioTable
                table={assignedTable}
                isLoading={assignedLoading}
                emptyMessage="Aucun client attribué trouvé."
                renderMobileRow={renderAssignedMobileRow}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal" className="mt-0">
          <Card className="border-none shadow-sm">
            <CardHeader className="p-2.5 md:p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <UserRound className="h-4 w-4 text-emerald-600" />
                    Portefeuille personnel
                  </CardTitle>
                  <p className="truncate text-xs text-muted-foreground">Clients créés par vous.</p>
                </div>
                <Button onClick={() => openForm()} size="sm" className="h-8 rounded-xl">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-2.5 pt-0 md:p-3 md:pt-0">
              <PortfolioTable
                table={personalTable}
                isLoading={personalLoading}
                emptyMessage="Aucun client personnel trouvé."
                renderMobileRow={renderPersonalMobileRow}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none overflow-y-auto rounded-none p-3 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl sm:p-6">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Modifier client personnel" : "Ajouter client personnel"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Nom du client *</label>
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Téléphone *</label>
              <Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="mt-1 rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">N° compte *</label>
              <Input value={form.accountNumber} onChange={(event) => setForm((current) => ({ ...current, accountNumber: event.target.value }))} className="mt-1 rounded-xl" />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl">Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
