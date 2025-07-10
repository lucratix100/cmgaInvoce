import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import InvoiceClient from "./invoiceClient"
import { getCurrentUser } from "@/actions/user"

async function getInitialData() {
  const cookieStore = await cookies()
  const token = cookieStore.get("accessToken")

  if (!token) {
    redirect("/")
  }

  try {
    const user = await getCurrentUser()
    return { user }
  } catch (error) {
    console.error("Erreur lors du chargement des données:", error)
    return { user: null }
  }
}

export default async function InvoicePage() {
  const initialData = await getInitialData()
  return <InvoiceClient initialData={initialData} />
}
