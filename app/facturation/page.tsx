import { getCurrentUser } from "@/actions/user"
import { Role } from "@/types/roles"
import { getFacturationCommercialBls } from "@/actions/facturation-actions"
import FacturationClient from "./facturation-client"

export default async function FacturationPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== Role.FACTURATION) {
    return null
  }

  const bls = await getFacturationCommercialBls()

  return <FacturationClient initialBls={bls} />
}
