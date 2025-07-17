import { getCurrentUser } from "@/actions/user"
import { getUrgentInvoices } from "@/actions/recovery"
import RecoveryClient from "./recoveryClient"
import { Role } from "@/types/roles"
import { redirect } from "next/navigation"

export default async function RecoveryPage() {
  const user = await getCurrentUser()

  // Vérifier que l'utilisateur est admin
  if (user?.role !== Role.ADMIN) {
    redirect('/dashboard')
  }

  // Récupérer les factures urgentes
  const urgentData = await getUrgentInvoices()

  return (
    <RecoveryClient 
      initialData={urgentData}
      user={user}
    />
  )
} 