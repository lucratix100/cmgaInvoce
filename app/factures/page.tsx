import FactureClient from "./factureClient"
import { getCurrentUser } from "@/actions/user"
import { getInvoices } from "@/actions/invoice"
import { getDepots } from "@/actions/depot"
import { Role } from "@/types/roles"

export default async function FacturePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>
}) {
  const params = await searchParams
  
  const [user, invoices, depots] = await Promise.all([
    getCurrentUser(),
    getInvoices({
      startDate: params.startDate,
      endDate: params.endDate || undefined,
      status: params.status,
      search: params.search
    }),
    getDepots()
  ])

  const isRecouvrement = user?.role === Role.RECOUVREMENT

  return (
    <FactureClient
      initialData={{ user, invoices, depots }}
      isRecouvrement={isRecouvrement}
    />
  )
}





