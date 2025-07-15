import FactureClient from "./factureClient"
import { getCurrentUser } from "@/actions/user"
import { getInvoicesWithStatistics } from "@/actions/invoice"
import { getActiveDepots } from "@/actions/depot"
import { Role } from "@/types/roles"



export default async function FacturePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>
}) {
  const params = await searchParams
  const [user, invoicesData, depots] = await Promise.all([
    getCurrentUser(),
    getInvoicesWithStatistics({
      startDate: params.startDate,
      endDate: params.endDate || undefined,
      status: params.status,
      search: params.search,
      depot: params.depot
    }),
    getActiveDepots()
  ])

  const invoices = invoicesData.invoices || []
  const statistics = invoicesData.statistics


  const isRecouvrement = user?.role === Role.RECOUVREMENT

  return (
    <FactureClient
      initialData={{ user, invoices, depots, statistics }}
      isRecouvrement={isRecouvrement}
    />
  )
}





