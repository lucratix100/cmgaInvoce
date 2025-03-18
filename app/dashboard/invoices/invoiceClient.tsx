"use client"

import { BarChart3, Building, Clock, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Filtre from "@/components/facture/filtre"
import InvoiceTable from "@/components/facture/invoiceTable"
import Pagination from "@/components/facture/pagination"
import { useEffect, useState } from "react"
import { depot } from "@/types"
import { getDepots } from "@/actions/depot"
import { getDefaultDates } from "@/lib/date-utils"

interface FilterState {
  startDate: string
  endDate: string
  status: string
  searchInvoice: string
}

interface InvoiceClientProps {
  initialData: {
    user: any;
    invoices: any[];
  }
}

export default function InvoiceClient({ initialData }: InvoiceClientProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = 13
  const [depot, setDepot] = useState("")
  const [depots, setDepots] = useState<depot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    startDate: getDefaultDates().startDate,
    endDate: getDefaultDates().endDate,
    status: "tous",
    searchInvoice: ""
  })

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
      <Card className="bg-gradient-to-br from-green-50 to-white border-none shadow-md hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total des factures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">1,248</div>
              <div className="p-2 bg-primary-100 rounded-full text-primary">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-green-500 font-medium">+5.2%</span> depuis
              le mois dernier
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-none shadow-md hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Factures livrées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">892</div>
              <div className="p-2 bg-green-100 rounded-full text-green-600">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-green-500 font-medium">+12.4%</span> depuis
              le mois dernier
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-none shadow-md hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">356</div>
              <div className="p-2 bg-yellow-100 rounded-full text-yellow-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-red-500 font-medium">+2.8%</span> depuis le
              mois dernier
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <main className="px-4 md:px-6 py-8 space-y-6">
          <Card className="border-none shadow-md overflow-hidden bg-white ">
            <CardHeader className="bg-primary-50 pb-3">
              <CardTitle className="flex items-center gap-2 text-primary-700">
                <FileText className="h-5 w-5" />
                <div className="flex items-center gap-2 justify-between w-full">
                  <div>Liste des factures</div>
                </div>
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
    </div>
  )
} 