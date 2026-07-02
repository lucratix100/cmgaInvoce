import { getCurrentUser } from "@/actions/user"
import { getUrgentInvoices } from "@/actions/recovery"
import RecoveryClient from "./recoveryClient"

export default async function RecoveryPage() {
  const user = await getCurrentUser()
  // Récupérer les factures urgentes
  const urgentData = await getUrgentInvoices()

  return (
    <RecoveryClient 
      initialData={urgentData}
      user={user}
    />
  )
} 