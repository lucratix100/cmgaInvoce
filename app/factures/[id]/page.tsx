"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getInvoiceByNumber } from "@/actions/invoice"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Navbar from "@/components/factureId/navbar"
import Header from "@/components/factureId/header"
import Detail from "@/components/factureId/detail"
import Delivery from "@/components/factureId/delivery"
import History from "@/components/factureId/history"
import { InvoiceStatus } from "@/types/enums"


interface Invoice {
  id: number
  invoiceNumber: string
  accountNumber: string
  date: string
  status: InvoiceStatus
  totalAmount: number
  customer: {
    id: number
    name: string
    phone: string
  } | null
  depot: {
    id: number
    name: string
  } | null
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("details")

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true)
        const data = await getInvoiceByNumber(params.id as string)
        setInvoice({
          ...data,  
          status: data.status as InvoiceStatus
        })
      } catch (err) {
        setError("Erreur lors du chargement de la facture")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchInvoice()
    }
  }, [params.id])

  if (loading) return <div>Chargement...</div>
  if (error) return <div>Erreur: {error}</div>
  if (!invoice) return <div>Facture non trouvée</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Header invoice={invoice} />
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
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700"
            >
              Historique
            </TabsTrigger>
          </TabsList>
          <Detail invoice={invoice} />
          <Delivery invoice={invoice} />
          <History invoice={invoice} />
        </Tabs>
      </div>
    </div>
  )
}

