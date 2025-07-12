
import { Card } from "@/components/ui/card"
import { FileText, User, Phone, Calendar, Truck, Building, Badge } from "lucide-react"
import { InvoiceStatus, InvoicePaymentStatus } from "@/types/enums"
import { Invoice } from "@/types/invoice"

interface HeaderProps {
  invoice: Invoice
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
      case InvoicePaymentStatus.PAIEMENT_PARTIEL:
        return <span className="text-lg font-semibold text-yellow-600 bg-white border border-yellow-600 rounded-md px-2 py-1">PAIEMENT PARTIEL</span>
      case InvoicePaymentStatus.NON_PAYE:
        return <span className="text-lg font-semibold text-red-600 bg-white border border-red-600 rounded-md px-2 py-1">NON PAYÉE</span>
      default:
        return <span className="text-lg font-semibold text-gray-600 bg-white border border-gray-600 rounded-md px-2 py-1">{status}</span>
    }
  }

  return (
    <Card className="border-none bg-white overflow-hidden ">
      <div className="p-2">
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
            <p className="text-sm font-medium text-muted-foreground"></p>
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="">État de livraison :</span>
                  {getLivraisonBadge(invoice.status)}
                </div>
                <div>
                  <span className="">État de paiement : </span>
                  {getPaymentStatusBadge(invoice.statusPayment)}
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}