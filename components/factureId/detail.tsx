'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { TabsContent } from "@radix-ui/react-tabs"
import { Badge, FileText } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Invoice } from "@/types/invoice"

interface DetailProps {
  invoice: Invoice
}

export default function Detail({ invoice }: DetailProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount)
  }

  if (!invoice?.order) return null;

  // Calcul des totaux
  const totals = {
    totalHT: invoice.order.reduce((sum, item) => sum + item.totalHT, 0),
    tva: invoice.order.reduce((sum, item) => sum + (item.totalHT * 0.18), 0),
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
              {invoice.order?.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item?.reference}</TableCell>
                  <TableCell>{item?.designation}</TableCell>
                  <TableCell className="text-right">{item?.quantity?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell className="text-right">{formatAmount(item?.unitPrice || 0)}</TableCell>
                  <TableCell className="text-right">{formatAmount(item?.totalHT || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-en">
        <Card className="border-none shadow-md bg-white">
          <CardHeader className="bg-primary-50 pb-3">
            <CardTitle className="flex items-center gap-2 text-primary-700 text-sm">RÉCAPITULATIF</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">TOTAL HT</span>
                <span>{formatAmount(totals.totalHT)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">TVA 18%</span>
                <span>{formatAmount(totals.tva)}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-lg font-bold text-primary-700">
                <span>TOTAL TTC</span>
                <span>{formatAmount(totals.totalTTC)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  )
}