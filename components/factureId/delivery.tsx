'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Phone, Truck, User } from "lucide-react"
import { TabsContent } from "@radix-ui/react-tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Invoice } from "@/types/invoice"
import { getBls } from "@/actions/bl"
import { Badge } from "../ui/badge"
import { InvoiceProduct, BlProduct, Driver, Bl } from '@/lib/types'



export default function Delivery({ invoice }: { invoice: Invoice }) {
  const [bls, setBls] = useState<Bl[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBls = async () => {
      try {
        const data = await getBls(invoice.invoiceNumber)
        console.log(data, "bls")
        setBls(data)
      } finally {
        setLoading(false)
      }
    }
    loadBls()
  }, [invoice.invoiceNumber])

  const progressPercentage = useMemo(() =>
    bls.length > 0
      ? Math.round((bls.filter(bl => bl.status === 'validée').length / bls.length) * 100)
      : 0
    , [bls])

  const renderDriverInfo = (driver: Driver | null) => (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Truck className="h-5 w-5 text-primary-600" />
        <h4 className="font-medium text-gray-900">Information chauffeur</h4>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-primary-600" />
          <span className="text-sm text-gray-700">
            {driver?.firstname || 'Non assigné'} {driver?.lastname || ''}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Phone className="h-5 w-5 text-primary-600" />
          <span className="text-sm text-gray-700">{driver?.phone || 'N/A'}</span>
        </div>
      </div>
    </div>
  )

  const renderProductsTable = (products: BlProduct[]) => (
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-50">
          <TableHead className="w-1/4 font-medium">Référence</TableHead>
          <TableHead className="w-2/5 font-medium">Désignation</TableHead>
          <TableHead className="w-1/6 font-medium text-right">Qté livrée</TableHead>
          <TableHead className="w-1/6 font-medium text-right">Qté restante</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product, index) => (
          <TableRow key={index} className="hover:bg-gray-50">
            <TableCell className="font-medium">{product.reference || 'N/A'}</TableCell>
            <TableCell>{product.designation || 'N/A'}</TableCell>
            <TableCell className="text-right font-medium">
              {product.quantite}
            </TableCell>
            <TableCell className="text-right text-gray-700">
              {product.remainingQty}
            </TableCell>
          </TableRow>

        ))}
      </TableBody>
    </Table>
  )

  if (loading) return <div className="p-8 text-center">Chargement des livraisons...</div>

  return (
    <TabsContent value="livraisons">
      <Card className="border-none shadow-md bg-white">
        <CardHeader className="bg-primary-50 pb-3">
          <CardTitle className="flex items-center gap-2 text-primary-700">
            <Truck className="h-5 w-5" />
            Suivi des livraisons
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {bls.map((bl) => (
              <div key={bl.id} className="border rounded-lg">
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Livraison du {new Date(bl.createdAt).toLocaleDateString('fr-FR')}
                      </h3>
                      <Badge variant="outline" className="bg-primary-50 text-primary-700">
                        {bl.status}
                      </Badge>
                    </div>
                  </div>
                  {renderDriverInfo(bl.driver)}
                </div>
                <div className="p-4">
                  {renderProductsTable(bl.products)}
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center p-4 border rounded-lg bg-gray-50">
              <div>
                <h3 className="font-medium">Résumé des livraisons</h3>
                <p className="text-sm text-muted-foreground">
                  {bls.length} livraison{bls.length > 1 ? 's' : ''} effectuée{bls.length > 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">Progression: {progressPercentage}%</p>
                <p className="text-sm text-muted-foreground">
                  Dernière livraison: {bls[0]?.createdAt
                    ? new Date(bls[0].createdAt).toLocaleDateString('fr-FR')
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  )
}