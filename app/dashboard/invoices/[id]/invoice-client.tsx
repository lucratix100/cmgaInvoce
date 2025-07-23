"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Bell,
  CreditCard,
  FileText,
  Truck,
  Loader2,
  Edit,
  RotateCcw,
  CheckCheck,
  X,
} from "lucide-react";
import PaimentDialog from "@/components/paiment-dialog";
import Notification from "@/components/notification-dialog";
import Paiment from "@/components/factureId/paiment";
import Reminder from "@/components/factureId/reminder";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Detail from "@/components/factureId/detail";
import Delivery from "@/components/factureId/delivery";
import { Role } from "@/types/roles";
import { useInvoice } from "@/hooks/useInvoice";
import { useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";
import { markInvoiceAsDeliveredWithReturn, updateInvoiceStatus } from "@/actions/invoice";
import { updateInvoiceById } from "@/actions/invoice";
import { Invoice } from "@/types/invoice";
import { getPaymentHistory } from "@/actions/payment";
import { useQuery } from '@tanstack/react-query';
import { PaymentMethod } from "@/types/enums";
import { InvoicePaymentStatus, InvoiceStatus } from "@/types/enums";

interface InvoiceClientProps {
  invoice: any;
  user: any;
}

export default function InvoiceClient({ invoice, user }: InvoiceClientProps) {
  const router = useRouter();

  // Déterminer l'onglet actif selon le rôle sans useEffect
  const getActiveTab = () => {
    if (!user?.role) return "details";

    switch (user.role) {
      case Role.RECOUVREMENT:
        return "paiements";
      case Role.ADMIN:
        return "details";
      default:
        return "livraisons";
    }
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>('');
  const [isMarkAsReturnDialogOpen, setIsMarkAsReturnDialogOpen] = useState(false);
  const [returnComment, setReturnComment] = useState("");
  const [isMarkingAsReturn, setIsMarkingAsReturn] = useState(false);

  // Récupérer les paiements pour vérifier s'il y a des paiements de type RETOUR
  const { data: payments = [] } = useQuery({
    queryKey: ['payments', invoice?.invoiceNumber],
    queryFn: () => getPaymentHistory(invoice?.invoiceNumber || ''),
    enabled: !!invoice?.invoiceNumber,
  });

  const handleBack = () => {
    router.back();
  };

  // Fonction pour ouvrir le dialogue de confirmation
  const handleStatusChange = (newStatus: string) => {
    setPendingStatus(newStatus);
    setIsConfirmDialogOpen(true);
  };

  // Fonction pour ouvrir le dialogue de confirmation d'annulation
  const handleCancelInvoiceClick = () => {
    setIsCancelDialogOpen(true);
  };

  const handleCancelInvoice = async (invoiceId: number) => {
    setIsUpdatingStatus(true);
    setIsCancelDialogOpen(false);
    try {
      await updateInvoiceById({ id: invoiceId, status: InvoiceStatus.ANNULEE });
      toast.success('Facture annulée avec succès');
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour du statut');
    } finally {
      setIsUpdatingStatus(false);
    }
  }
  // Fonction pour confirmer le changement de statut
  const confirmStatusChange = async () => {
    if (!invoice || !pendingStatus) return;

    setIsUpdatingStatus(true);
    setIsConfirmDialogOpen(false);

    try {
      await updateInvoiceStatus(invoice.invoiceNumber, pendingStatus);

      const statusText = pendingStatus === 'régule' ? 'régule' : 'non réceptionnée';
      toast.success(`Statut de la facture mis à jour en "${statusText}"`);

      // Recharger les données de la facture
      // refetch();
      // // Invalider les requêtes liées aux factures
      // queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour du statut');
    } finally {
      setIsUpdatingStatus(false);
      setPendingStatus('');
    }
  };

  // Fonction pour annuler le changement de statut
  const cancelStatusChange = () => {
    setIsConfirmDialogOpen(false);
    setPendingStatus('');
  };

  // Fonction pour marquer comme livrée avec retour
  const handleMarkAsDeliveredWithReturn = async () => {
    if (!invoice) return;

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

  // Vérifier si on peut marquer comme livrée avec retour
  const canMarkAsDeliveredWithReturn = () => {
    if (!invoice) return false;

    // Vérifier le statut de la facture (en cours ou en cours de livraison)
    const validStatuses = [InvoiceStatus.EN_COURS, 'en cours de livraison'];
    const hasValidStatus = validStatuses.includes(invoice.status);
    
    // Vérifier que la facture est payée
    const isPaid = invoice.statusPayment === 'payé';
    
    // Vérifier qu'il y a au moins un paiement de type RETOUR
    const hasReturnPayment = payments.some((payment: any) => 
      payment.paymentMethod === PaymentMethod.RETOUR
    );
    
    // Vérifier les permissions utilisateur
    const hasPermission = user.role === Role.ADMIN || user.role === Role.RECOUVREMENT;
    
    return hasValidStatus && isPaid && hasReturnPayment && hasPermission;
  };

  // Déterminer le texte et l'action du bouton selon le statut actuel
  const getButtonConfig = () => {
    if (!invoice) return { text: 'REGULE', action: 'régule', disabled: true, color: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200' };

    if (invoice.status === 'régule') {
      return {
        text: 'NON RÉCEPTIONNÉE',
        action: 'non réceptionnée',
        disabled: isUpdatingStatus,
        color: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
      };
    } else {
      return {
        text: 'Marquer REGULE',
        action: 'régule',
        disabled: isUpdatingStatus,
        color: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200'
      };
    }
  };

  const buttonConfig = getButtonConfig();


  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <h3 className="text-lg font-semibold mb-2">Erreur</h3>
        <p className="text-muted-foreground">
          Impossible de charger les détails de la facture.
        </p>
        <Button onClick={handleBack} className="mt-4">
          Retour aux factures
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full  sm:px-4 lg:px-1">
      <div className="flex  flex-col space-y-2 mt-2">
        <div className="flex items-center w-full space-x-2">
          <div className="flex items-center">
            {/* <Button onClick={handleBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />Retour aux factures
            </Button> */}
          </div>
          <div className="flex">
            {user?.role === Role.ADMIN && (
              <>
                <Button
                  className={`flex items-center gap-2 ${buttonConfig.color}`}
                  onClick={() => handleStatusChange(buttonConfig.action)}
                  disabled={buttonConfig.disabled}
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Edit className="h-4 w-4" />
                  )}
                  {isUpdatingStatus ? 'Mise à jour...' : buttonConfig.text}
                </Button>
                {invoice.status !== InvoiceStatus.ANNULEE && invoice.statusPayment !== InvoicePaymentStatus.PAYE && <Button
                  className={`flex ml-2 items-center gap-2 bg-red-400 text-white hover:bg-red-600 `}
                  onClick={handleCancelInvoiceClick}
                  disabled={isUpdatingStatus}
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  {isUpdatingStatus ? 'Mise à jour...' : 'Annuler la facture'}
                </Button>}
              </>
            )}
          </div>
          <div className="flex items-center w-full gap-2 justify-end">
            {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
              <>
                <PaimentDialog
                  invoiceNumber={invoice.invoiceNumber}
                // onSuccess={handlePaymentSuccess}
                />
                {canMarkAsDeliveredWithReturn() && (
                  <Button
                    variant="outline"
                    onClick={() => setIsMarkAsReturnDialogOpen(true)}
                    className="hover:bg-green-100 hover:text-green-700 text-green-600 border-green-200"
                  >
                    <CheckCheck className="h-4 w-4 mr-2" />
                    Marquer  livrée
                  </Button>
                )}
                <Button variant="outline" className="flex items-center gap-2" onClick={() => setIsNotificationOpen(true)}>
                  <Bell className="h-4 w-4" /> Ajouter un rappel
                </Button>
                <Dialog open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
                  <DialogContent className="bg-white">
                    <DialogTitle>Rappel de suivi</DialogTitle>
                    <DialogDescription>Créez un rappel pour la facture {invoice.invoiceNumber}</DialogDescription>
                    <Notification
                      invoiceId={invoice.id}
                      user={user}
                      onClose={() => setIsNotificationOpen(false)}
                      onSuccess={() => {
                        setIsNotificationOpen(false);
                        // Rafraîchir les données si nécessaire
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Dialogue de confirmation pour le changement de statut */}
        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Confirmation de changement de statut</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir changer le statut de la facture {invoice.invoiceNumber} en "{pendingStatus}" ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={cancelStatusChange}>
                Annuler
              </Button>
              <Button onClick={confirmStatusChange}>
                Confirmer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Dialogue pour marquer comme livrée avec retour */}
        <Dialog open={isMarkAsReturnDialogOpen} onOpenChange={setIsMarkAsReturnDialogOpen}>
          <DialogContent className="bg-white">
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

        {/* Dialogue de confirmation pour l'annulation de facture */}
        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Confirmation d'annulation</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir annuler la facture {invoice.invoiceNumber} ? Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => handleCancelInvoice(invoice.id)}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                Confirmer l'annulation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full space-y-4"
        >
          <TabsList className="w-full bg-white border">
            <TabsTrigger
              value="details"
              className="flex-1 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              Détails
            </TabsTrigger>
            <TabsTrigger
              value="livraisons"
              className="flex-1 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700"
            >
              <Truck className="w-4 h-4 mr-2" />
              Suivi des livraisons
            </TabsTrigger>
            {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
              <TabsTrigger
                value="paiements"
                className="flex-1 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Suivi des paiements
              </TabsTrigger>
            )}
          </TabsList>

          <Detail invoice={invoice} userRole={user?.role} />
          <Delivery invoice={invoice} activeTab={activeTab} />
          {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
            <Paiment invoice={invoice} user={user} />
          )}
          {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
            <Reminder />
          )}
        </Tabs>
      </div>
    </div>
  );
}