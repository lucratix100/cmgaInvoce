"use client"

import { Card } from "@/components/ui/card"
import RecouvrementTable from "@/components/recouvrement/recouvrement-table"
import { Loader2, FileX } from "lucide-react"
import { useInvoices } from "@/hooks/useInvoices"
import { useDepots } from "@/hooks/useDepots"
import { useSearchParams } from "next/navigation"

interface InvoiceClientProps {
  initialData: {
    user: any;
  }
}

export default function InvoiceClient({ initialData }: InvoiceClientProps) {
  const searchParams = useSearchParams()

  // Utiliser les hooks TanStack Query
  const { invoices, isLoading: invoicesLoading } = useInvoices({
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    status: searchParams.get('status') || undefined,
    search: searchParams.get('search') || undefined,
  })

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
              />
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
} 