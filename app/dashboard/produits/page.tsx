import { getCommercialProducts } from "@/actions/commercial-admin"
import { getCurrentUser } from "@/actions/user"
import CommercialProductsClient from "@/components/commercial-admin/commercial-products-client"
import { Role } from "@/types/roles"
import { redirect } from "next/navigation"

export default async function AdminProductsPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== Role.ADMIN) {
    redirect("/")
  }

  const products = await getCommercialProducts()

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-2xl border bg-gradient-to-br from-white to-primary/5 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary/60">Administration</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Produits commerciaux</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Gérez la liste simple des produits que les agents peuvent sélectionner dans une commande client.
        </p>
      </div>
      <CommercialProductsClient initialProducts={products} />
    </div>
  )
}
