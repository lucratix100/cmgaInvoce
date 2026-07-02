import { getCommercialAgents } from "@/actions/commercial-admin"
import { getRoots } from "@/actions/root-actions"
import { getCurrentUser } from "@/actions/user"
import { CommercialInvoiceAssignment } from "@/components/commercial-admin/commercial-invoice-assignment"
import { Role } from "@/types/roles"
import { redirect } from "next/navigation"

export default async function CommercialInvoiceAssignmentsPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== Role.COMMERCIAL_ADMIN) {
    redirect("/")
  }

  const [roots, agents] = await Promise.all([
    getRoots(),
    getCommercialAgents(),
  ])

  const formattedRoots = roots.map((root) => ({
    id: String(root.id),
    value: root.name,
    suffixes: (root.commercialInitials || []).map((suffix: any) => ({
      id: String(suffix.id),
      value: suffix.name,
    })),
  }))

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Affectation factures</h1>
        <p className="text-gray-600">Affectez les factures par racine ou suffixe aux commerciaux.</p>
      </div>
      <CommercialInvoiceAssignment roots={formattedRoots} agents={agents} />
    </div>
  )
}
