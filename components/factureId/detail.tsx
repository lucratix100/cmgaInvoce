'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { TabsContent } from "@radix-ui/react-tabs"
import { Badge, FileText } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Invoice, InvoiceProduct } from "@/lib/types"
import Paiment from "./paiment"
import { Role } from "@/types/roles"

interface DetailProps {
  invoice: Invoice;
  userRole: string;
}

export default function Detail({ invoice, userRole }: DetailProps) {
  console.log("invoiceDetail", invoice)
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount)
  }

  if (!invoice?.order) return null;

  // Calcul des totaux
  const totals = {
    totalHT: invoice.order.reduce((sum, item) => sum + item.total, 0),
    tva: invoice.order.reduce((sum, item) => sum + (item.total * 0.18), 0),
    get totalTTC() { return this.totalHT + this.tva }
  }

  return (
    <TabsContent value="details" className="space-y-6">
      <Card className="border-none shadow-md bg-white overflow-hidden">
        <CardHeader className="bg-primary-50 pb-3">
          <CardTitle className="flex items-center gap-2 text-primary-700">
            <FileText className="h-5 w-5" />
            Articles
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary-50/50">
                <TableHead className="font-semibold text-primary-900">Référence</TableHead>
                <TableHead className="font-semibold text-primary-900">Désignation</TableHead>
                <TableHead className="font-semibold text-primary-900 text-right">Quantité</TableHead>
                <TableHead className="font-semibold text-primary-900 text-right">Prix unitaire</TableHead>
                <TableHead className="font-semibold text-primary-900 text-right">Montant HT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.order?.map((product: InvoiceProduct, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{product?.reference}</TableCell>
                  <TableCell>{product?.designation}</TableCell>
                  <TableCell className="text-right">{product?.quantite}</TableCell>
                  <TableCell className="text-right">{formatAmount(product.prixUnitaire)}</TableCell>
                  <TableCell className="text-right">{formatAmount(product.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="flex justify-end">
        {(userRole === Role.RECOUVREMENT || userRole === Role.ADMIN) && (
          <Paiment invoice={invoice} user={{ role: userRole }} />
        )}
        <div className="w-1/6"></div>
        <Card className="border-none shadow-md bg-white w-1/2">
          <CardHeader className="bg-primary-50 pb-3">
            <CardTitle className="flex items-center gap-2 text-primary-700 text-sm">RÉCAPITULATIF</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">TOTAL HT</span>
                <span>{formatAmount(invoice.totalTtc / 1.18)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">TVA 18%</span>
                <span>{formatAmount(invoice.totalTtc - (invoice.totalTtc / 1.18))}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-lg font-bold text-primary-700">
                <span>TOTAL TTC</span>
                <span>{formatAmount(invoice.totalTtc)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  )
}