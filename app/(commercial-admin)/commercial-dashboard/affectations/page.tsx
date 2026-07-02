import {
  getCommercialAgents,
  getCommercialAssignmentHistories,
  getCommercialAssignments,
  getCommercialClients,
} from "@/actions/commercial-admin"
import { getCurrentUser } from "@/actions/user"
import CommercialAffectationsClient from "@/components/commercial-admin/commercial-affectations-client"
import { Role } from "@/types/roles"
import { redirect } from "next/navigation"

export default async function CommercialAffectationsPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== Role.COMMERCIAL_ADMIN) {
    redirect("/")
  }

  const [agents, clients, assignments, histories] = await Promise.all([
    getCommercialAgents(),
    getCommercialClients(),
    getCommercialAssignments(),
    getCommercialAssignmentHistories(),
  ])

  return (
    <div className="space-y-3 p-3 md:p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-tight text-gray-900">Gestion de portefeuilles</h1>
          <p className="text-sm text-gray-500">Consultez et organisez rapidement le portefeuille des commerciaux.</p>
        </div>
      </div>
      <CommercialAffectationsClient
        initialAgents={agents}
        initialClients={clients}
        initialAssignments={assignments}
        initialHistories={histories}
      />
    </div>
  )
}
