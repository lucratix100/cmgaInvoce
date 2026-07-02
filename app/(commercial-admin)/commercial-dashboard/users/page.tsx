import { getCommercialAgents } from "@/actions/commercial-admin"
import { getCurrentUser } from "@/actions/user"
import CommercialUsersClient from "@/components/commercial-admin/commercial-users-client"
import { Role } from "@/types/roles"
import { redirect } from "next/navigation"

export default async function CommercialUsersPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== Role.COMMERCIAL_ADMIN) {
    redirect("/")
  }

  const agents = await getCommercialAgents()

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Commerciaux</h1>
        <p className="text-gray-600">Ajoutez, modifiez ou désactivez les utilisateurs commerciaux.</p>
      </div>
      <CommercialUsersClient initialAgents={agents} />
    </div>
  )
}
