'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { TabsContent } from "@radix-ui/react-tabs"
import { Badge, FileText, RotateCcw, Loader2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Invoice, InvoiceProduct } from "@/lib/types"
import Paiment from "./paiment"
import { Role } from "@/types/roles"
import { InvoiceStatus } from "@/types/enums"
import { markInvoiceAsDeliveredWithReturn } from "@/actions/invoice"
import { useState } from "react"
import { toast } from "sonner"

interface DetailProps {
  invoice: Invoice;
  userRole: string;
}

export default function Detail({ invoice, userRole }: DetailProps) {
  console.log("invoiceDetail", invoice)
  const [isMarkAsReturnDialogOpen, setIsMarkAsReturnDialogOpen] = useState(false);
  const [returnComment, setReturnComment] = useState("");
  const [isMarkingAsReturn, setIsMarkingAsReturn] = useState(false);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount)
  }

  const handleMarkAsDeliveredWithReturn = async () => {
    try {
      setIsMarkingAsReturn(true);
      await markInvoiceAsDeliveredWithReturn(invoice.invoiceNumber, returnComment);
      
      toast.success("Facture marquée comme 'LIVREE' avec succès");
      
      // Recharger la page pour mettre à jour les données
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du marquage de la facture");
    } finally {
      setIsMarkingAsReturn(false);
      setIsMarkAsReturnDialogOpen(false);
      setReturnComment("");
    }
  };

  // const canMarkAsDeliveredWithReturn = () => {
  //   return invoice.status === InvoiceStatus.EN_COURS && 
  //          invoice.statusPayment === 'payé' &&
  //          (userRole === Role.ADMIN || userRole === Role.RECOUVREMENT);
  // };

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
              
              {/* Bouton pour marquer comme livrée avec retour
              {canMarkAsDeliveredWithReturn() && (
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsMarkAsReturnDialogOpen(true)}
                    className="w-full hover:bg-red-100 hover:text-red-700 text-red-600 border-red-200"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Marquer comme livrée
                  </Button>
                </div>
              )} */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogue de confirmation pour marquer comme livrée avec retour */}
      <Dialog open={isMarkAsReturnDialogOpen} onOpenChange={setIsMarkAsReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marquer comme livrée</DialogTitle>
            <DialogDescription>
              Veuillez entrer un commentaire pour la livraison.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="comment" className="text-right">
                Commentaire
              </Label>
              <Textarea
                id="comment"
                value={returnComment}
                onChange={(e) => setReturnComment(e.target.value)}
                className="col-span-3"
                placeholder="Commentaire sur la livraison..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMarkAsReturnDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleMarkAsDeliveredWithReturn} disabled={isMarkingAsReturn}>
              {isMarkingAsReturn ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              {isMarkingAsReturn ? 'Marquage en cours...' : 'Marquer comme livrée'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  )
}