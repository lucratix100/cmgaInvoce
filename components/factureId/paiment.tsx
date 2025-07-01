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
    <TabsContent value="paiements" className="space-y-6">
      <Card className="border-none shadow-md bg-white">
        <CardHeader className="bg-primary-50 pb-3">
          <CardTitle className="flex items-center gap-2 text-primary-700">
            <DollarSign className="h-5 w-5" />
            Suivi des paiements
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex flex-row gap-4 w-full pb-2">
              <Card className="flex-1 min-w-[180px] bg-gradient-to-br from-primary-50 to-white border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Montant total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatAmount(invoice.totalTtc)}
                  </div>
                </CardContent>
              </Card>
              <Card className="flex-1 min-w-[180px] bg-gradient-to-br from-green-50 to-white border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Montant payé</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatAmount(totalPaid)}
                  </div>
                </CardContent>
              </Card>
              <Card className="flex-1 min-w-[180px] bg-gradient-to-br from-amber-50 to-white border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Reste à payer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatAmount(resteAPayer)}
                  </div>
                </CardContent>
              </Card>
              {surplus > 0 && (
                <Card className="flex-1 min-w-[180px] bg-gradient-to-br from-blue-50 to-white border-none shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-700">Surplus</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-700">
                      {formatAmount(surplus)}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-primary-50 p-4">
                <h3 className="font-medium text-primary-700">Historique des paiements</h3>
              </div>
              <div className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-medium">Date</TableHead>
                      <TableHead className="font-medium">Montant payé</TableHead>
                      <TableHead className="font-medium">Reste à payer</TableHead>
                      <TableHead className="font-medium">Surplus</TableHead>
                      <TableHead className="font-medium">Mode de paiement</TableHead>
                      <TableHead className="font-medium">Infos chèque</TableHead>
                      <TableHead className="font-medium">Commentaire</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          Chargement des paiements...
                        </TableCell>
                      </TableRow>
                    ) : payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          Aucun paiement enregistré
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment, index) => {
                        // Calculer le montant payé jusqu'à ce paiement inclus
                        const paidUpToThisPayment = payments
                          .slice(0, index + 1)
                          .reduce((sum, p) => sum + p.amount, 0);
                        
                        // Calculer le reste à payer après ce paiement
                        const remainingAfterThisPayment = Math.max(0, invoice.totalTtc - paidUpToThisPayment);
                        
                        // Calculer le surplus créé par ce paiement
                        const surplusFromThisPayment = paidUpToThisPayment > invoice.totalTtc 
                          ? paidUpToThisPayment - invoice.totalTtc 
                          : 0;
                        
                        // Déterminer si c'est un paiement par chèque
                        const isCheckPayment = payment.paymentMethod === PaymentMethod.CHEQUE;
                        
                        return (
                          <TableRow key={payment.id}>
                            <TableCell>{new Date(payment.paymentDate).toLocaleDateString('fr-FR')}</TableCell>
                            <TableCell className="font-medium">{formatAmount(payment.amount)}</TableCell>
                            <TableCell className={remainingAfterThisPayment === 0 ? "text-green-600 font-medium" : ""}>
                              {remainingAfterThisPayment === 0 ? "Payé" : formatAmount(remainingAfterThisPayment)}
                            </TableCell>
                            <TableCell className={surplusFromThisPayment > 0 ? "text-blue-600 font-medium" : ""}>
                              {surplusFromThisPayment > 0 ? formatAmount(surplusFromThisPayment) : "-"}
                            </TableCell>
                            <TableCell>{payment.paymentMethod}</TableCell>
                            <TableCell>
                              {isCheckPayment ? (
                                <div className="text-xs">
                                  <div>{payment.chequeInfo || 'N/A'}</div>
                                </div>
                              ) : "-"}
                            </TableCell>
                            <TableCell>
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
            <div className="flex justify-between items-center p-4 border rounded-lg bg-gray-50">
              <div>
                <h3 className="font-medium">Informations de paiement</h3>
                <p className="text-sm text-muted-foreground">
                  Statut de paiement: 
                  <Badge className={isPaid ? "bg-green-100 text-green-700 ml-2" : (isPartiallyPaid ? "bg-amber-100 text-amber-700 ml-2" : "bg-red-100 text-red-700 ml-2")}>
                    {invoice.statusPayment}
                  </Badge>
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">Progression: 
                  {Math.round((totalPaid / invoice.totalTtc) * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">
                  Date de création: 
                  {new Date(invoice.date).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
