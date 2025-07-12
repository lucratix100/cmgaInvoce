import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, DollarSign, Edit, Trash2, AlertCircle, Lock } from "lucide-react";
import { TabsContent } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "@/components/ui/button";
import { Invoice } from "@/lib/types";
import { InvoicePaymentStatus, PaymentMethod } from "@/types/enums";
import { getPaymentHistory, deletePayment } from "@/actions/payment";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Role } from "@/types/roles";
import PaimentDialog from "@/components/paiment-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getInvoicePaymentCalculations } from "@/actions/invoice";
import { useQueryClient, useQuery } from '@tanstack/react-query';

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
  user?: any; // Informations de l'utilisateur connecté
}

export default function Paiment({ invoice, user }: PaimentProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const queryClient = useQueryClient();
  
  // Utiliser React Query pour les paiements
  const {
    data: payments = [],
    isLoading: paymentsLoading,
    error: paymentsError,
    refetch: refetchPayments
  } = useQuery({
    queryKey: ['payments', invoice.invoiceNumber],
    queryFn: () => getPaymentHistory(invoice.invoiceNumber),
    staleTime: 0, // Toujours considérer comme périmé pour forcer la revalidation
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Utiliser React Query pour les calculs
  const {
    data: calculationsData,
    isLoading: calculationsLoading,
    error: calculationsError
  } = useQuery({
    queryKey: ['payment-calculations', invoice.invoiceNumber],
    queryFn: () => getInvoicePaymentCalculations(invoice.invoiceNumber),
    staleTime: 0, // Toujours considérer comme périmé pour forcer la revalidation
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Forcer la revalidation quand le composant est monté ou quand invoice.invoiceNumber change
  useEffect(() => {
    console.log('🔄 Revalidation des données pour:', invoice.invoiceNumber);
    // Invalider et recharger les données pour s'assurer qu'elles sont à jour
    queryClient.invalidateQueries({ queryKey: ['payments', invoice.invoiceNumber] });
    queryClient.invalidateQueries({ queryKey: ['payment-calculations', invoice.invoiceNumber] });
  }, [invoice.invoiceNumber, queryClient]);

  // Extraire les calculs ou utiliser des valeurs par défaut
  const calculations = calculationsData?.calculations || {
    totalPaid: 0,
    remainingAmount: 0,
    surplus: 0,
    paymentPercentage: 0
  };
   
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
  };

  // Déterminer si la facture est payée en fonction du statusPayment
  const isPaid = invoice.statusPayment === InvoicePaymentStatus.PAYE;
  const isPartiallyPaid = invoice.statusPayment === InvoicePaymentStatus.PAIEMENT_PARTIEL;

  // Vérifier les permissions de modification/suppression
  const canModifyPayment = (payment: Payment) => {
    if (!user) return false;
    
    // Seuls ADMIN et RECOUVREMENT peuvent modifier/supprimer
    if (user.role !== Role.ADMIN && user.role !== Role.RECOUVREMENT) {
      return false;
    }
    
    // Si l'utilisateur est RECOUVREMENT et que la facture est PAYE, refuser
    if (user.role === Role.RECOUVREMENT && isPaid) {
      return false;
    }
    
    return true;
  };

  // Fonction pour recharger les données
  const refreshData = () => {
    console.log('🔄 RefreshData appelé pour:', invoice.invoiceNumber);
    // Revalider seulement les données spécifiques aux paiements
    queryClient.invalidateQueries({ queryKey: ['payments', invoice.invoiceNumber] });
    queryClient.invalidateQueries({ queryKey: ['payment-calculations', invoice.invoiceNumber] });
    // Forcer un refetch immédiat
    refetchPayments();
    // Ne pas revalider les données de facture pour éviter le changement de tab
  };

  // Utiliser les données calculées côté backend
  const { totalPaid, remainingAmount, surplus, paymentPercentage } = calculations;

  const handleDeletePayment = (payment: Payment) => {
    if (!canModifyPayment(payment)) {
      if (user?.role === Role.RECOUVREMENT && isPaid) {
        toast.error("Vous ne pouvez pas supprimer un paiement lorsque la facture est marquée comme PAYE. Seul un administrateur peut effectuer cette suppression.");
      } else {
        toast.error("Vous n'avez pas les permissions pour supprimer ce paiement");
      }
      return;
    }

    setSelectedPayment(payment);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedPayment) return;

    try {
      setDeleteLoading(true);
      await deletePayment(selectedPayment.id);
      
      // Recharger seulement les données de paiement
      queryClient.invalidateQueries({ queryKey: ['payments', invoice.invoiceNumber] });
      queryClient.invalidateQueries({ queryKey: ['payment-calculations', invoice.invoiceNumber] });
      
      toast.success("Paiement supprimé avec succès");
      setIsDeleteDialogOpen(false);
      setSelectedPayment(null);
    } catch (error: any) {
      console.error("Erreur lors de la suppression:", error);
      toast.error(error.message || "Erreur lors de la suppression du paiement");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Afficher les erreurs si elles existent
  if (paymentsError) {
    console.error("Erreur lors de la récupération des paiements:", paymentsError);
  }

  if (calculationsError) {
    console.error("Erreur lors de la récupération des calculs:", calculationsError);
  }

  const loading = paymentsLoading || calculationsLoading;

  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
  );

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
                    {formatAmount(remainingAmount)}
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
                      {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
                        <TableHead className="font-medium text-xs">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) ? 8 : 7} className="text-center py-2 text-sm">
                          Chargement...
                        </TableCell>
                      </TableRow>
                    ) : sortedPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) ? 8 : 7} className="text-center py-4">
                          Aucun paiement enregistré
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedPayments.map((payment, index) => {
                        // Calculer les montants après ce paiement en utilisant les données backend
                        const paidUpToThisPayment = sortedPayments
                          .slice(0, index + 1)
                          .reduce((sum, p) => sum + p.amount, 0);
                        const remainingAfterThisPayment = Math.max(0, invoice.totalTtc - paidUpToThisPayment);
                        const surplusFromThisPayment = paidUpToThisPayment > invoice.totalTtc 
                          ? paidUpToThisPayment - invoice.totalTtc 
                          : 0;
                        const isCheckPayment = payment.paymentMethod === PaymentMethod.CHEQUE;
                        const canModify = canModifyPayment(payment);
                        
                        return (
                          <TableRow key={payment.id} className="text-sm">
                            <TableCell className="py-1">{new Date(payment.paymentDate).toLocaleDateString('fr-FR')}</TableCell>
                            <TableCell className="font-medium">{formatAmount(payment.amount)}</TableCell>
                            <TableCell className={remainingAfterThisPayment === 0 ? "text-green-600 font-medium" : ""}>
                              {paidUpToThisPayment >= invoice.totalTtc
                                ? "Payé"
                                : formatAmount(remainingAfterThisPayment)}
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
                            {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
                              <TableCell className="text-xs">
                               {invoice.statusPayment !== InvoicePaymentStatus.PAYE ? <div className="flex gap-1">
                                  <PaimentDialog
                                    invoiceNumber={invoice.invoiceNumber}
                                    payment={payment}
                                    onSuccess={refreshData}
                                    trigger={
                                       <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={!canModify}
                                        className="h-6 w-6 p-0"
                                        title={canModify ? "Modifier" : "Non autorisé"}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    }
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeletePayment(payment)}
                                    disabled={!canModify}
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    title={canModify ? "Supprimer" : "Non autorisé"}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div> : <div className="flex gap-1">
                                  <Lock className="h-4 w-4 font-bold text-red-600" />
                                </div>} 
                              </TableCell>
                            )}
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
                  Progression: {paymentPercentage}%
                </p>
                <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(paymentPercentage, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Créé le: {new Date(invoice.date).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action ne peut pas être annulée. Cela supprimera définitivement le paiement de {selectedPayment && formatAmount(selectedPayment.amount)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={deleteLoading}>
              {deleteLoading ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TabsContent>
  );
}
