'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"
import { TabsContent } from "@radix-ui/react-tabs"
import { Invoice } from "@/types/invoice"

interface HistoryProps {
  invoice: Invoice
}

const invoiceData = {
    company: {
      name: "COMPAGNIE MAMADOU NGONE AGRO-INDUSTRIES",
      address: "SODIDA LOT 37638 - BP: 17439 - DAKAR - SENEGAL",
      rc: "RC N° SN DKR 2016 9578 - NINEA: 005897770 2K3",
      tel: "TEL: +221 33 869 37 89",
      web: "www.cmga.sn - info@cmga.sn",
    },
    invoice: {
      number: "FA0038269",
      accountNumber: "411ASFHYP01",
      date: "28/01/2025",
      client: {
        name: "HYPERMARCHE VDN",
        details: ["ARISTH", "VDN", "ALMADIES"],
        tel: "77 121 05 54",
        representative: "COUMBA TINE",
      },
      printDate: "03/02/2025 - 09:27",
      status: "en-cours", // nouveau: en-attente, en-cours, livree, annulee
      livraison: {
        type: "en-cours", // en-cours ou complete
        progression: 65, // pourcentage de progression
        derniereLivraison: "15/02/2025",
      },
    },
    items: [
      {
        reference: "EAYIHUILET0",
        designation: "HUILE TOURNESOL BON APPETIT 12 X 1L",
        quantity: 10.0,
        quantityLivree: 10.0, // Quantité déjà livrée
        unitPrice: 11864,
        tva: 18,
        totalHT: 14000,
        totalTTC: 140000,
        status: "livree", // livree, en-attente, en-cours
      },
      {
        reference: "SEAHUILET",
        designation: "HUILE TOURNESOL BON APPETIT 48 * 250ML",
        quantity: 5.0,
        quantityLivree: 3.0, // Livraison en cours
        unitPrice: 13559,
        tva: 18,
        totalHT: 16000,
        totalTTC: 80000,
        status: "en-cours",
      },
      {
        reference: "CHALCOKT0",
        designation: "COCKTAIL DE FRUITS 24 X 425G",
        quantity: 10.0,
        quantityLivree: 5.0, // Livraison partielle
        unitPrice: 12246,
        tva: 18,
        totalHT: 14450,
        totalTTC: 144500,
        status: "en-cours",
      },
      {
        reference: "CHALCOKT0",
        designation: "COCKTAIL DE FRUITS 12 X 565G",
        quantity: 10.0,
        quantityLivree: 0.0, // Pas encore livré
        unitPrice: 7839,
        tva: 18,
        totalHT: 9250,
        totalTTC: 92500,
        status: "en-attente",
      },
      {
        reference: "CHALCOKT0",
        designation: "COCKTAIL DE FRUITS 12 X 825G",
        quantity: 5.0,
        quantityLivree: 0.0, // Pas encore livré
        unitPrice: 11017,
        tva: 18,
        totalHT: 13000,
        totalTTC: 65000,
        status: "en-attente",
      },
    ],
    totals: {
      totalHT: 541737,
      tva: 97513,
      totalTTC: 639250,
    },
    comments: "YAYA CISSE",
    history: [
      {
        date: "03/02/2025 - 09:27",
        status: "Facture créée",
        user: "Mamadou Ba",
        details: "Création de la facture dans le système",
      },
      {
        date: "10/02/2025 - 14:30",
        status: "Livraison partielle",
        user: "Ibrahima Diallo",
        details: "Livraison de 10 cartons d'huile tournesol 12 X 1L",
      },
      {
        date: "12/02/2025 - 11:15",
        status: "Livraison partielle",
        user: "Ibrahima Diallo",
        details: "Livraison de 3 cartons d'huile tournesol 48 * 250ML et 5 cartons de cocktail de fruits 24 X 425G",
      },
      {
        date: "15/02/2025 - 16:45",
        status: "En attente",
        user: "Coumba Tine",
        details: "Reste des articles en attente de livraison",
      },
    ],
    livraisons: [
      {
        id: 1,
        date: "10/02/2025",
        conducteur: "Ibrahima Diallo",
        vehicule: "Camion 3T (DK-5678-AB)",
        articles: [{ reference: "EAYIHUILET0", designation: "HUILE TOURNESOL BON APPETIT 12 X 1L", quantity: 10.0 }],
      },
      {
        id: 2,
        date: "12/02/2025",
        conducteur: "Ibrahima Diallo",
        vehicule: "Camion 3T (DK-5678-AB)",
        articles: [
          { reference: "SEAHUILET", designation: "HUILE TOURNESOL BON APPETIT 48 * 250ML", quantity: 3.0 },
          { reference: "CHALCOKT0", designation: "COCKTAIL DE FRUITS 24 X 425G", quantity: 5.0 },
        ],
      },
    ],
  }

export default function History({ invoice }: HistoryProps) {
    return (
<TabsContent value="history">
<Card className="border-none shadow-md bg-white">
  <CardHeader className="bg-primary-50 pb-3">
    <CardTitle className="flex items-center gap-2 text-primary-700">
      <Clock className="h-5 w-5" />
      Historique des statuts
    </CardTitle>
  </CardHeader>
  <CardContent className="p-6">
    <div className="space-y-6">
      {invoiceData.history.map((event, index) => (
        <div
          key={index}
          className="relative pl-6 pb-6 border-l-2 border-primary-200 last:border-0 last:pb-0"
        >
          <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary"></div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <p className="font-medium text-primary-700">{event.status}</p>
              <p className="text-sm text-muted-foreground">{event.details}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{event.date}</span>
              <span className="text-primary">•</span>
              <span>{event.user}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
</TabsContent>
    )
}