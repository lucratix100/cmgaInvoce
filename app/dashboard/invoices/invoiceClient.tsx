"use client"

import { Card } from "@/components/ui/card"
import RecouvrementTable from "@/components/recouvrement/recouvrement-table"
import { Loader2, FileX } from "lucide-react"
import { useInvoicesWithStatistics } from "@/hooks/useInvoicesWithStatistics"
import { useDepots } from "@/hooks/useDepots"
import { useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { useQueryClient } from '@tanstack/react-query';
import type { Invoice } from "@/lib/types"

type InvoiceQueryParams = {
  startDate?: string;
  endDate?: string;
  status?: string;
  search?: string;
  depot?: string;
  disableDefaultDate?: boolean;
}

type InvoiceQueryData = {
  invoices: Invoice[];
  statistics: {
    total: {
      count: number;
      amount: number;
    };
    byStatus: Record<string, { count: number; amount: number }>;
  } | null;
}

interface InvoiceClientProps {
  initialData: {
    user: any;
    depots: any;
  }
  disableDefaultDate?: boolean;
}

export default function InvoiceClient({ initialData, disableDefaultDate = false }: InvoiceClientProps) {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient();

  // Utiliser useMemo pour éviter les re-créations inutiles des paramètres
  const queryParams = useMemo(() => {
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined
    const depot = searchParams.get('depot') || undefined

    // Ne retourner que les paramètres qui ont une valeur
    const params: InvoiceQueryParams = {}
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    if (status) params.status = status
    if (search) params.search = search
    if (depot) params.depot = depot
    if (disableDefaultDate) params.disableDefaultDate = true

    return params
  }, [
    searchParams.get('startDate'),
    searchParams.get('endDate'),
    searchParams.get('status'),
    searchParams.get('search'),
    searchParams.get('depot'),
    disableDefaultDate
  ])

  // Utiliser les hooks TanStack Query avec les paramètres optimisés
  const { invoices, statistics, isLoading: invoicesLoading } = useInvoicesWithStatistics(queryParams)
  console.log({ invoices, statistics })

  // const { depots, isLoading: depotsLoading } = useDepots()

  const isLoading = invoicesLoading
  const isEmpty = !isLoading && invoices.length === 0

  // Fonction pour refetch après paiement avec mise à jour optimiste
  const handlePaymentSuccess = (updatedFacture: Invoice, invoiceNumber: string) => {
    // 1. Optimistic update du cache
    queryClient.setQueryData<InvoiceQueryData>(['invoices-with-statistics', queryParams], (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        invoices: oldData.invoices.map((f) =>
          f.invoiceNumber === invoiceNumber ? { ...f, ...updatedFacture } : f
        ),
      };
    });
    // 2. Invalidation pour resynchroniser avec le serveur
    queryClient.invalidateQueries({ queryKey: ['invoices-with-statistics'] });
  };

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
          <Card className="overflow-hidden border-none bg-white shadow-md">
            <RecouvrementTable
              factures={invoices}
              user={initialData.user}
              isLoading={isLoading}
              depots={initialData.depots}
              statistics={statistics}
              onPaymentSuccess={handlePaymentSuccess}
              disableDefaultDate={disableDefaultDate}
            />
          </Card>
        </main>
      </div>
    </div>
  )
} 