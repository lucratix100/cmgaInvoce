
import FactureClient from "./factureClient"
import { getCurrentUser } from "@/actions/user"
import { getInvoices } from "@/actions/invoice"
import { getDepots } from "@/actions/depot"
import { Role } from "@/types/roles"



export default async function FacturePage({
  searchParams,
}: {
  searchParams: { [key: string]: string }
}) {
  const [user, invoices, depots] = await Promise.all([
    getCurrentUser(),
    getInvoices({
      startDate: searchParams.startDate,
      endDate: searchParams.endDate || undefined,
      status: searchParams.status,
      search: searchParams.search
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





