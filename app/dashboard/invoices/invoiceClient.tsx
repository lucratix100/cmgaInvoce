"use client"

import { Card } from "@/components/ui/card"
import RecouvrementTable from "@/components/recouvrement/recouvrement-table"
import { Loader2, FileX } from "lucide-react"

interface InvoiceClientProps {
  initialData: {
    user: any;
    invoices: any[];
    depots: any[];
  }
}

export default function InvoiceClient({ initialData }: InvoiceClientProps) {
  const isLoading = !initialData.invoices;
  const isEmpty = !isLoading && initialData.invoices.length === 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }



  return (
    <div>
      <div className="">
        <main className="">
          <Card className="border-none shadow-md overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <RecouvrementTable
                factures={initialData.invoices || []}
                user={initialData.user}
                isLoading={isLoading}
                depots={initialData.depots || []}
              />
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
} 