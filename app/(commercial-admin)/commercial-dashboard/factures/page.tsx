import { getActiveDepots } from "@/actions/depot"
import { getCurrentUser } from "@/actions/user"
import { Role } from "@/types/roles"
import { redirect } from "next/navigation"
import InvoiceClient from "@/app/dashboard/invoices/invoiceClient"

export default async function CommercialFacturesPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== Role.COMMERCIAL_ADMIN) {
    redirect("/")
  }

  const depots = await getActiveDepots()

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Factures</h1>
        <p className="text-gray-600">Consultation des factures en lecture seule.</p>
      </div>
      <InvoiceClient initialData={{ user, depots }} />
    </div>
  )
}
