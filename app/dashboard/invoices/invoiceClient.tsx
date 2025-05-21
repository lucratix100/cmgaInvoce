"use client"

import { Card } from "@/components/ui/card"
import RecouvrementTable from "@/components/recouvrement/recouvrement-table"


interface InvoiceClientProps {
  initialData: {
    user: any;
    invoices: any[];
  }
}

export default function InvoiceClient({ initialData }: InvoiceClientProps) {
  return (
    <div>
      <div className="">
        <main className="">
          <Card className="border-none shadow-md overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <RecouvrementTable factures = {initialData.invoices} user={initialData.user} />
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
} 