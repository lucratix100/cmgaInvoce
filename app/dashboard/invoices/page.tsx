import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import InvoiceClient from "./invoiceClient"
import { getCurrentUser } from "@/actions/user"
import { getActiveDepots } from "@/actions/depot"
async function getInitialData() {
  const cookieStore = await cookies()
  const token = cookieStore.get("accessToken")

  if (!token) {
    redirect("/")
  }


  const user = await getCurrentUser()
  const depots = await getActiveDepots()
  return { user, depots }

}

export default async function InvoicePage() {
  const initialData = await getInitialData()
  console.log({ initialData })
  return <InvoiceClient initialData={initialData} />
}
