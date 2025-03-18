"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getInvoiceByNumber } from "@/actions/invoice"
import { InvoiceStatus } from "@/types/enums"
import type { Invoice } from "@/types/invoice"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Header from "@/components/factureId/header"
import Detail from "@/components/factureId/detail"
import Delivery from "@/components/factureId/delivery"
import History from "@/components/factureId/history"
import { ArrowLeft, Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DashboardInvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("details")

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const data = await getInvoiceByNumber(params.id as string)
        console.log(data, 'data')

        setInvoice({
          ...data,
          status: data.status as InvoiceStatus
        })
      } finally {
        setLoading(false)
      }
    }

    if (params.id) fetchInvoice()
  }, [params.id])

  if (loading) return <div>Chargement...</div>
  if (!invoice) return <div>Facture non trouvée</div>

  const handleRoute = () => {
    router.back()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      {/* Navbar */}
      <div className="flex h-16 items-center px-4 md:px-6 justify-between">
        <Button onClick={handleRoute} className="flex items-center gap-2 text-white hover:text-primary-600 hover:bg-transparent transition-all duration-600">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-lg font-semibold">Retour aux factures</span>
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-primary-100 hover:text-primary-700 transition-colors"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-primary-100 hover:text-primary-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Télécharger
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* En-tête de la facture */}
        <Header invoice={invoice} />
        {/* Contenu de la facture */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border">
            <TabsTrigger
              value="details"
              className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700"
            >
              Détails
            </TabsTrigger>
            <TabsTrigger
              value="livraisons"
              className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700"
            >
              Suivi des livraisons
            </TabsTrigger>
            {/* <TabsTrigger
              value="history"
              className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700"
            >
              Historique
            </TabsTrigger> */}
          </TabsList>
          <Detail invoice={invoice} />
          <Delivery invoice={invoice} />
          {/* <History invoice={invoice} /> */}
        </Tabs>
      </div>
    </div>
  )
}

