import { getCurrentUser } from "@/actions/user"
import { getRecoverySettings, getRoots, getCustomDelays } from "@/actions/recovery"
import RecoverySettingsClient from "./recoverySettingsClient"
import { Role } from "@/types/roles"
import { redirect } from "next/navigation"

export default async function RecoverySettingsPage() {
  const user = await getCurrentUser()
  // Vérifier que l'utilisateur est admin


  // Récupérer les paramètres de recouvrement, les racines et les délais personnalisés
  const [settingsData, rootsData, customDelaysData] = await Promise.all([
    getRecoverySettings(),
    getRoots(),
    getCustomDelays()
  ])

  return (
    <RecoverySettingsClient
      initialData={settingsData}
      rootsData={rootsData}
      customDelaysData={customDelaysData}
      user={user}
    />
  )
} 