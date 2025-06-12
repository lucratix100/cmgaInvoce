import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import InvoiceClient from "./invoiceClient"
import { getCurrentUser } from "@/actions/user"
import { getInvoices } from "@/actions/invoice"
import { getDepots } from "@/actions/depot"

async function getInitialData(searchParams: { [key: string]: string }) {
  const cookieStore = await cookies()
  const token = cookieStore.get("accessToken")

  if (!token) {
    redirect("/")
  }

  try {
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
    console.log(depots, "depots")

    return { user, invoices, depots }
  } catch (error) {
    console.error("Erreur lors du chargement des données:", error)
    return { user: null, invoices: [], depots: [] }
  }
}

export default async function InvoicePage({
  searchParams,
}: {
  searchParams: { [key: string]: string }
}) {
  const initialData = await getInitialData(searchParams)
  return <InvoiceClient initialData={initialData} />
}
