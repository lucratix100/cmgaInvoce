import { getActiveDepots } from "@/actions/depot"
import { getCurrentUser } from "@/actions/user"
import InvoiceClient from "@/app/dashboard/invoices/invoiceClient"
import { Role } from "@/types/roles"
import { redirect } from "next/navigation"

export default async function AgentFacturesPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== Role.AGENT_COMMERCIAL) {
    redirect("/")
  }

  const depots = await getActiveDepots()

  return (
    <div className="space-y-3 p-3 md:space-y-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Mes factures</h1>
        <p className="hidden text-muted-foreground sm:block">Factures issues de vos racines assignées.</p>
      </div>
      <InvoiceClient initialData={{ user, depots }} />
    </div>
  )
}
