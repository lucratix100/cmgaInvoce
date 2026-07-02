import { getCurrentUser } from "@/actions/user"
import CommercialDashboardClient from "@/components/commercial-admin/commercial-dashboard-client"
import { redirect } from "next/navigation"
import { Role } from "@/types/roles"

export default async function CommercialDashboardPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== Role.COMMERCIAL_ADMIN) {
    redirect("/")
  }

  const userName = `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Responsable"

  return <CommercialDashboardClient userName={userName} />
}
