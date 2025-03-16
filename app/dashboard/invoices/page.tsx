import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import InvoiceClient from "./invoiceClient"
import { getCurrentUser } from "@/actions/user"
import { getInvoices } from "@/actions/invoice"

async function getInitialData(searchParams: { [key: string]: string }) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")

  if (!token) {
    redirect("/")
  }

  try {
    const [user, invoices] = await Promise.all([
      getCurrentUser(),
      getInvoices({
        startDate: searchParams.startDate,
        endDate: searchParams.endDate,
        status: searchParams.status,
        search: searchParams.search
      })
    ])

    return { user, invoices }
  } catch (error) {
    console.error("Erreur lors du chargement des données:", error)
    return { user: null, invoices: [] }
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
