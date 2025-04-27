import { Card } from "@/components/ui/card"
import { FileText, User, Phone, Calendar, Truck, Building, Badge } from "lucide-react"
import { InvoiceStatus, InvoicePaymentStatus } from "@/types/enums"
import { Invoice } from "@/types/invoice"

interface HeaderProps {
  invoice: Invoice
}

const companyInfo = {
  name: "COMPAGNIE MAMADOU NGONE AGRO-INDUSTRIES",
  address: "SODIDA LOT 37638 - BP: 17439 - DAKAR - SENEGAL",
  rc: "RC N° SN DKR 2016 9578 - NINEA: 005897770 2K3",
  tel: "TEL: +221 33 869 37 89",
  web: "www.cmga.sn - info@cmga.sn",
}

export default function Header({ invoice }: HeaderProps) {
  if (!invoice) return null;  // Protection contre les valeurs undefined

  const getLivraisonBadge = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.LIVREE:
        return <span className="text-lg font-semibold text-green-600 bg-white border border-green-600 rounded-md px-2 py-1">LIVRÉE</span>
      case InvoiceStatus.EN_COURS:
        return <span className="text-lg font-semibold text-blue-600 bg-white border border-blue-600 rounded-md px-2 py-1">EN COURS DE LIVRAISON</span>
      case InvoiceStatus.EN_ATTENTE:
        return <span className="text-lg font-semibold text-yellow-600 bg-white border rounded-md px-2 py-1">EN ATTENTE DE LIVRAISON</span>
      default:
        return <span className="text-lg font-semibold text-gray-600 bg-white border border-gray-600 rounded-md px-2 py-1">{status}</span>
    }
  }

  const getPaymentStatusBadge = (status: InvoicePaymentStatus) => {
    switch (status) {
      case InvoicePaymentStatus.PAYE:
        return <span className="text-lg font-semibold text-green-600 bg-white border border-green-600 rounded-md px-2 py-1">PAYÉE</span>
      case InvoicePaymentStatus.PARTIELLEMENT_PAYE:
        return <span className="text-lg font-semibold text-yellow-600 bg-white border border-yellow-600 rounded-md px-2 py-1">PAIEMENT PARTIEL</span>
      case InvoicePaymentStatus.NON_PAYE:
        return <span className="text-lg font-semibold text-red-600 bg-white border border-red-600 rounded-md px-2 py-1">NON PAYÉE</span>
      default:
        return <span className="text-lg font-semibold text-gray-600 bg-white border border-gray-600 rounded-md px-2 py-1">{status}</span>
    }
  }

  return (
    <Card className="border-none shadow-md bg-white overflow-hidden">
      <div className="bg-primary text-white p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-white text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Facture #{invoice.invoiceNumber}
            </h1>
            <p className="text-primary-100">Créée le {new Date(invoice.date).toLocaleDateString()}</p>
          </div>
          <div className="flex flex-col items-end gap-4">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              <span className="text-white font-bold">Dépôt: {invoice.depot?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary-100">État de livraison :</span>
              {getLivraisonBadge(invoice.status)}
            </div>
            <div>
              <span className="text-primary-100">État de paiement : </span> 
              {getPaymentStatusBadge(invoice.statusPayment)}
            </div>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Informations client</p>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary" />
                <p className="font-medium">{invoice.customer?.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <p className="text-sm">{invoice.customer?.phone || <span className="text-muted-foreground">Non renseigné</span>}</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Détails de la facture</p>
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-primary" />
              <p className="text-sm">
                <span className="font-medium">N° Facture:</span> {invoice.invoiceNumber}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-primary" />
              <p className="text-sm">
                <span className="font-medium">N° Compte:</span> {invoice.accountNumber}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-primary" />
              <p className="text-sm">
                <span className="font-medium">Date:</span> {new Date(invoice.date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Informations société</p>
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">{companyInfo.name}</p>
                <p className="text-sm text-muted-foreground">{companyInfo.address}</p>
                <p className="text-sm text-muted-foreground">{companyInfo.tel}</p>
                <p className="text-sm text-muted-foreground">{companyInfo.web}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}