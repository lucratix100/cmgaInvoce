"use client"

import { useState } from "react"
import { FileText } from "lucide-react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import Header from "@/components/navbar/navbar"
import Pagination from "@/components/facture/pagination"
import InvoiceTable from "@/components/facture/invoiceTable"

interface FactureClientProps {
  initialData: {
    user: any;
    invoices: any[];
  }
}

export default function FactureClient({ initialData }: FactureClientProps) {
  const [currentPage, setCurrentPage] = useState(3)
  const totalPages = 13

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      <Header/>
      <main className="px-4 md:px-6 py-8 space-y-6">
        <Card className="border-none shadow-md overflow-hidden bg-white">
          <CardHeader className="bg-primary-50 pb-3">
            <CardTitle className="flex items-center gap-2 text-primary-700">
              <FileText className="h-5 w-5" />
              Liste des factures
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <InvoiceTable initialData={initialData} />
          </div>
          <Pagination 
            totalPages={totalPages} 
            currentPage={currentPage} 
            setCurrentPage={setCurrentPage} 
          />
        </Card>
      </main>
    </div>
  )
}