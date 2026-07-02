import { getAdminCommercialBlReviews } from "@/actions/commercial-admin"
import { getCurrentUser } from "@/actions/user"
import { Role } from "@/types/roles"
import { redirect } from "next/navigation"
import AdminCommercialBlReviewClient from "./admin-commercial-bl-review-client"

type PageSearchParams = Record<string, string | string[] | undefined>

function getSearchParam(params: PageSearchParams, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

export default async function AdminCommercialBlsPage({
  searchParams,
}: {
  searchParams?: PageSearchParams | Promise<PageSearchParams>
}) {
  const user = await getCurrentUser()

  if (!user || user.role !== Role.ADMIN) {
    redirect("/")
  }

  const params = searchParams ? await searchParams : {}
  const rawStatus = getSearchParam(params, "status")
  if (!rawStatus) {
    const search = getSearchParam(params, "search") || ""
    redirect(`/dashboard/commercial-bls?status=CONFIRME${search ? `&search=${encodeURIComponent(search)}` : ""}`)
  }

  const status = rawStatus && ["CONFIRME", "VALIDE_ADMIN", "REJETE_ADMIN", "FACTURE", "all"].includes(rawStatus)
    ? rawStatus
    : "CONFIRME"
  const search = getSearchParam(params, "search") || ""

  const bls = await getAdminCommercialBlReviews()

  return <AdminCommercialBlReviewClient initialBls={bls} initialFilters={{ status, search }} />
}
