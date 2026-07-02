import { getCurrentUser } from "@/actions/user"
import { getCommercialClients } from "@/actions/commercial-admin"
import CommercialImportClient from "@/components/commercial-admin/commercial-import-client"
import { Role } from "@/types/roles"
import { redirect } from "next/navigation"

export default async function CommercialImportPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== Role.COMMERCIAL_ADMIN) {
    redirect("/")
  }

  const clients = await getCommercialClients({ includeInactive: true })

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Clients commerciaux</h1>
        <p className="text-gray-600">Importez ou créez manuellement les clients individuels, enseignes et locaux de magasin.</p>
      </div>
      <CommercialImportClient initialClients={clients} />
    </div>
  )
}
