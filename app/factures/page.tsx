import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import FactureClient from "./factureClient"
import { getCurrentUser } from "@/actions/user"
import { getInvoices } from "@/actions/invoice"

async function getInitialData(searchParams: { [key: string]: string }) {
  const cookieStore = await cookies()
  const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

  if (!token) {
    redirect("/")
  }
  try {
    const [user, invoices] = await Promise.all([
      getCurrentUser(),
      getInvoices({
        startDate: searchParams.startDate,
        endDate: searchParams.endDate
      })
    ])

    return { user, invoices }
  } catch (error) {
    console.error("Erreur lors du chargement des données:", error)
    return { user: null, invoices: [] }
  }
}

export default async function FacturePage({
  searchParams,
}: {
  searchParams: { [key: string]: string }
}) {
  const initialData = await getInitialData(searchParams)
  console.log(initialData, "initialData");
  const isRecouvrement = initialData.user?.role === "RECOUVREMENT"

  return (
    <FactureClient 
      initialData={initialData} 
      isRecouvrement={isRecouvrement} 
    />
  )
}





