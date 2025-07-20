"use client"

import { Card } from "@/components/ui/card"
import { FileText, User, Phone, Calendar, Truck, Building, Badge, Copy, Check } from "lucide-react"
import { InvoiceStatus, InvoicePaymentStatus } from "@/types/enums"
import { Invoice } from "@/types/invoice"
import { useState } from "react"

interface HeaderProps {
  invoice: Invoice
}

export default function Header({ invoice }: HeaderProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!invoice) return null;

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  const getLivraisonBadge = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.LIVREE:
        return <span className="text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded px-2 py-0.5">LIVRÉE</span>
      case InvoiceStatus.EN_COURS:
        return <span className="text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">EN COURS</span>
      case InvoiceStatus.EN_ATTENTE:
        return <span className="text-sm font-medium text-yellow-600 bg-yellow-50 border border-yellow-200 rounded px-2 py-0.5">EN ATTENTE</span>
      case InvoiceStatus.REGULE:
        return <span className="text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded px-2 py-0.5">RÉGULÉ</span>
      case InvoiceStatus.RETOUR:
        return <span className="text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded px-2 py-0.5">RETOUR</span>
      default:
        return <span className="text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">{status}</span>
    }
  }

  const getPaymentStatusBadge = (status: InvoicePaymentStatus) => {
    switch (status) {
      case InvoicePaymentStatus.PAYE:
        return <span className="text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded px-2 py-0.5">PAYÉE</span>
      case InvoicePaymentStatus.PAIEMENT_PARTIEL:
        return <span className="text-sm font-medium text-yellow-600 bg-yellow-50 border border-yellow-200 rounded px-2 py-0.5">PARTIEL</span>
      case InvoicePaymentStatus.NON_PAYE:
        return <span className="text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded px-2 py-0.5">NON PAYÉE</span>
      default:
        return <span className="text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">{status}</span>
    }
  }

  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <div className="p-4">
        {/* Ligne unique avec toutes les informations */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-semibold text-gray-900">#{invoice.invoiceNumber}</span>
              <button
                onClick={() => copyToClipboard(invoice.invoiceNumber, 'invoice')}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Copier le numéro de facture"
              >
                {copiedField === 'invoice' ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span className="font-medium text-gray-900">{invoice.customer?.name}</span>
            </div>
            {invoice.customer?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-sm text-gray-600">{invoice.customer.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-gray-400" />
              <span className="text-sm text-gray-600">Compte: {invoice.accountNumber}</span>
              <button
                onClick={() => copyToClipboard(invoice.accountNumber, 'account')}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Copier le numéro de compte"
              >
                {copiedField === 'account' ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span className="text-sm text-gray-600">{new Date(invoice.date).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Livraison:</span>
              {getLivraisonBadge(invoice.status)}
            </div>
            {invoice.status !== InvoiceStatus.RETOUR && <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Paiement:</span>
              {getPaymentStatusBadge(invoice.statusPayment)}
            </div>}
          </div>
        </div>
      </div>
    </Card>
  )
}