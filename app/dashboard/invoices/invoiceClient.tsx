"use client"

import { Card } from "@/components/ui/card"
import RecouvrementTable from "@/components/recouvrement/recouvrement-table"
import { Loader2, FileX } from "lucide-react"
import { useInvoicesWithStatistics } from "@/hooks/useInvoicesWithStatistics"
import { useDepots } from "@/hooks/useDepots"
import { useSearchParams } from "next/navigation"
import { useMemo } from "react"

interface InvoiceClientProps {
  initialData: {
    user: any;
  }
}

export default function InvoiceClient({ initialData }: InvoiceClientProps) {
  const searchParams = useSearchParams()

  // Utiliser useMemo pour éviter les re-créations inutiles des paramètres
  const queryParams = useMemo(() => {
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined
    const depot = searchParams.get('depot') || undefined

    // Ne retourner que les paramètres qui ont une valeur
    const params: any = {}
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    if (status) params.status = status
    if (search) params.search = search
    if (depot) params.depot = depot

    return params
  }, [
    searchParams.get('startDate'),
    searchParams.get('endDate'),
    searchParams.get('status'),
    searchParams.get('search'),
    searchParams.get('depot')
  ])

  // Utiliser les hooks TanStack Query avec les paramètres optimisés
  const { invoices, statistics, isLoading: invoicesLoading } = useInvoicesWithStatistics(queryParams)
  console.log({ invoices, statistics })

  const { depots, isLoading: depotsLoading } = useDepots()

  const isLoading = invoicesLoading || depotsLoading
  const isEmpty = !isLoading && invoices.length === 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // if (isEmpty) {
  //   return (
  //     <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
  //       <FileX className="h-12 w-12 text-muted-foreground mb-4" />
  //       <h3 className="text-lg font-semibold mb-2">Aucune facture trouvée</h3>
  //       <p className="text-muted-foreground">
  //         Aucune facture ne correspond aux critères de recherche.
  //       </p>
  //     </div>
  //   );
  // }

  return (
    <div>
      <div className="">
        <main className="">
          <Card className="border-none shadow-md overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <RecouvrementTable
                factures={invoices}
                user={initialData.user}
                isLoading={isLoading}
                depots={depots}
                statistics={statistics}
              />
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
} 