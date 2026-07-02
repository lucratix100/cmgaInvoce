import { getCommercialAgents, getCommercialAssignments, getCommercialPlanning } from "@/actions/commercial-admin"
import { getCurrentUser } from "@/actions/user"
import CommercialPlanningClient from "@/components/commercial-admin/commercial-planning-client"
import { Role } from "@/types/roles"
import { redirect } from "next/navigation"

export default async function CommercialPlanningPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== Role.COMMERCIAL_ADMIN) {
    redirect("/")
  }

  const [agents, assignments, planning] = await Promise.all([
    getCommercialAgents(),
    getCommercialAssignments(),
    getCommercialPlanning(),
  ])

  return (
    <div className="space-y-3 p-2 md:p-3">
      <div>
        <h1 className="text-xl font-bold">Planning hebdomadaire</h1>
        <p className="text-sm text-gray-600">Choisissez un commercial dans le select, puis organisez son planning.</p>
      </div>
      <CommercialPlanningClient initialAgents={agents} initialAssignments={assignments} initialPlanning={planning} />
    </div>
  )
}
