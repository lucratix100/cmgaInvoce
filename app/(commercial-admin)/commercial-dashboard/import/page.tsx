import { getCurrentUser } from "@/actions/user"
import {
  getCommercialClients,
  getCommercialClientsPage,
  getCommercialLocationsPage,
} from "@/actions/commercial-admin"
import CommercialImportClient from "@/components/commercial-admin/commercial-import-client"
import { CommercialClient, CommercialClientLocation } from "@/types/commercial"
import { Role } from "@/types/roles"
import { redirect } from "next/navigation"

type SearchParams = {
  tab?: string
  page?: string
  pageSize?: string
  q?: string
  enseigneId?: string
}

const DEFAULT_PAGE_SIZE = 10

export default async function CommercialImportPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>
}) {
  const user = await getCurrentUser()

  if (!user || user.role !== Role.COMMERCIAL_ADMIN) {
    redirect("/")
  }

  const params = searchParams ? await searchParams : {}
  const tab = ["clients", "enseignes", "locaux"].includes(params.tab || "")
    ? (params.tab as "clients" | "enseignes" | "locaux")
    : "clients"
  const page = Math.max(Number(params.page) || 1, 1)
  const pageSize = Math.min(Math.max(Number(params.pageSize) || DEFAULT_PAGE_SIZE, 1), 100)
  const q = (params.q || "").trim()
  const enseigneId = Number(params.enseigneId) || null

  const isLocaux = tab === "locaux"

  const [directory, enseignes] = await Promise.all([
    isLocaux
      ? getCommercialLocationsPage({
          includeInactive: true,
          search: q || undefined,
          commercialClientId: enseigneId,
          page,
          pageSize,
          withCounts: true,
        })
      : getCommercialClientsPage({
          includeInactive: true,
          search: q || undefined,
          type: tab === "enseignes" ? "MAGASIN" : "INDIVIDUEL",
          page,
          pageSize,
          withCounts: true,
        }),
    getCommercialClients({ type: "MAGASIN", includeInactive: true }),
  ])

  const clients = isLocaux ? ([] as CommercialClient[]) : (directory.data as CommercialClient[])
  const locations = isLocaux ? (directory.data as CommercialClientLocation[]) : ([] as CommercialClientLocation[])

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Clients commerciaux</h1>
        <p className="text-sm text-muted-foreground">
          Gérez les clients individuels, enseignes et points de vente — import Excel ou création manuelle.
        </p>
      </div>
      <CommercialImportClient
        tab={tab}
        page={page}
        pageSize={pageSize}
        q={q}
        enseigneId={enseigneId}
        clients={clients}
        locations={locations}
        meta={directory.meta}
        counts={directory.counts || { clients: 0, enseignes: 0, locaux: 0 }}
        enseignes={enseignes}
      />
    </div>
  )
}
