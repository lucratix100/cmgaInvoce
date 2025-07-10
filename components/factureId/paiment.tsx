import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, DollarSign } from "lucide-react";
import { TabsContent } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Invoice } from "@/lib/types";
import { InvoicePaymentStatus, PaymentMethod } from "@/types/enums";
import { getPaymentHistory } from "@/actions/payment";
import { useEffect, useState } from "react";

interface Payment {
  id: number;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  comment: string | null;
  chequeInfo: string | null;
}

interface PaimentProps {
  invoice: Invoice;
}

export default function Paiment({ invoice }: PaimentProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
   
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
  };

  // Déterminer si la facture est payée en fonction du statusPayment
  const isPaid = invoice.statusPayment === InvoicePaymentStatus.PAYE;
  const isPartiallyPaid = invoice.statusPayment === InvoicePaymentStatus.PAIEMENT_PARTIEL;

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const paymentsData = await getPaymentHistory(invoice.invoiceNumber);
        setPayments(paymentsData);
      } catch (error) {
        console.error("Erreur lors de la récupération des paiements:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [invoice.invoiceNumber]);

  // Calculer le montant total payé
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const resteAPayer = Math.max(0, invoice.totalTtc - totalPaid);
  const surplus = totalPaid > invoice.totalTtc ? totalPaid - invoice.totalTtc : 0;

  return (
    <TabsContent value="paiements" className="space-y-4">
      <Card className="border-none shadow-md bg-white">
        <CardHeader className="bg-primary-50 py-2">
          <CardTitle className="flex items-center gap-2 text-primary-700 text-sm">
            <DollarSign className="h-4 w-4" />
            Suivi des paiements
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="bg-gradient-to-br from-primary-50 to-white border-none shadow-sm">
                <CardHeader className="pb-1 pt-2">
                  <CardTitle className="text-xs text-muted-foreground">Montant total</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-lg font-bold">
                    {formatAmount(invoice.totalTtc)}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-white border-none shadow-sm">
                <CardHeader className="pb-1 pt-2">
                  <CardTitle className="text-xs text-muted-foreground">Montant payé</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-lg font-bold">
                    {formatAmount(totalPaid)}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-50 to-white border-none shadow-sm">
                <CardHeader className="pb-1 pt-2">
                  <CardTitle className="text-xs text-muted-foreground">Reste à payer</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-lg font-bold">
                    {formatAmount(resteAPayer)}
                  </div>
                </CardContent>
              </Card>
              {surplus > 0 && (
                <Card className="bg-gradient-to-br from-blue-50 to-white border-none shadow-sm">
                  <CardHeader className="pb-1 pt-2">
                    <CardTitle className="text-xs text-blue-700">Surplus</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-lg font-bold text-blue-700">
                      {formatAmount(surplus)}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-primary-50 px-3 py-2">
                <h3 className="font-medium text-primary-700 text-sm">Historique des paiements</h3>
              </div>
              <div className="p-2">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-medium text-xs py-2">Date</TableHead>
                      <TableHead className="font-medium text-xs">Montant</TableHead>
                      <TableHead className="font-medium text-xs">Reste</TableHead>
                      <TableHead className="font-medium text-xs">Surplus</TableHead>
                      <TableHead className="font-medium text-xs">Mode</TableHead>
                      <TableHead className="font-medium text-xs">Chèque</TableHead>
                      <TableHead className="font-medium text-xs">Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-2 text-sm">
                          Chargement...
                        </TableCell>
                      </TableRow>
                    ) : payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-2 text-sm">
                          Aucun paiement
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment, index) => {
                        const paidUpToThisPayment = payments
                          .slice(0, index + 1)
                          .reduce((sum, p) => sum + p.amount, 0);
                        const remainingAfterThisPayment = Math.max(0, invoice.totalTtc - paidUpToThisPayment);
                        const surplusFromThisPayment = paidUpToThisPayment > invoice.totalTtc 
                          ? paidUpToThisPayment - invoice.totalTtc 
                          : 0;
                        const isCheckPayment = payment.paymentMethod === PaymentMethod.CHEQUE;
                        
                        return (
                          <TableRow key={payment.id} className="text-sm">
                            <TableCell className="py-1">{new Date(payment.paymentDate).toLocaleDateString('fr-FR')}</TableCell>
                            <TableCell className="font-medium">{formatAmount(payment.amount)}</TableCell>
                            <TableCell className={remainingAfterThisPayment === 0 ? "text-green-600 font-medium" : ""}>
                              {remainingAfterThisPayment === 0 ? "Payé" : formatAmount(remainingAfterThisPayment)}
                            </TableCell>
                            <TableCell className={surplusFromThisPayment > 0 ? "text-blue-600 font-medium" : ""}>
                              {surplusFromThisPayment > 0 ? formatAmount(surplusFromThisPayment) : "-"}
                            </TableCell>
                            <TableCell>{payment.paymentMethod}</TableCell>
                            <TableCell className="text-xs">
                              {isCheckPayment ? payment.chequeInfo || 'N/A' : "-"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {payment.comment || '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 border rounded-lg bg-gray-50">
              <div>
                <h3 className="font-medium text-sm">Informations de paiement</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Statut: 
                  <Badge className={`ml-1 text-xs ${
                    isPaid ? "bg-green-100 text-green-700" : 
                    isPartiallyPaid ? "bg-amber-100 text-amber-700" : 
                    "bg-red-100 text-red-700"
                  }`}>
                    {invoice.statusPayment}
                  </Badge>
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-sm">
                  Progression: {Math.round((totalPaid / invoice.totalTtc) * 100)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Créé le: {new Date(invoice.date).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
