import { getCommercialAgents } from "@/actions/commercial-admin"
import { getCurrentUser } from "@/actions/user"
import CommercialAgentHistoryClient from "@/components/commercial-admin/commercial-agent-history-client"
import { Role } from "@/types/roles"
import { redirect } from "next/navigation"

export default async function CommercialAgentHistoryPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== Role.COMMERCIAL_ADMIN) {
    redirect("/")
  }

  const agents = await getCommercialAgents()

  return (
    <div className="p-2 md:p-3">
      <CommercialAgentHistoryClient agents={agents} />
    </div>
  )
}
