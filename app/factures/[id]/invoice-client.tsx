"use client";
import { useState, useEffect } from "react";
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
import { Invoice } from "@/lib/types";
import Detail from "@/components/factureId/detail";
import Delivery from "@/components/factureId/delivery";
import { Role } from "@/types/roles";
import { useQuery } from '@tanstack/react-query';
import { toast } from "sonner";
import { markInvoiceAsDeliveredWithReturn } from "@/actions/invoice";
import { getPaymentHistory } from "@/actions/payment";
import { InvoiceStatus, PaymentMethod } from "@/types/enums";
import { updateInvoiceById } from "@/actions/invoice";

interface InvoiceClientProps {
  invoice: Invoice;
  user: any;
}

export default function InvoiceClient({ invoice, user }: InvoiceClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("details");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMarkAsReturnDialogOpen, setIsMarkAsReturnDialogOpen] = useState(false);
  const [returnComment, setReturnComment] = useState("");
  const [isMarkingAsReturn, setIsMarkingAsReturn] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const showSavePaymentButton = [InvoiceStatus.ANNULEE, InvoiceStatus.RETOUR, InvoiceStatus.REGULE].includes(invoice.status) ;

  // Récupérer les paiements pour vérifier s'il y a des paiements de type RETOUR
  const { data: payments = [] } = useQuery({
    queryKey: ['payments', invoice?.invoiceNumber],
    queryFn: () => getPaymentHistory(invoice?.invoiceNumber || ''),
    enabled: !!invoice?.invoiceNumber,
  });

  // Logique de redirection automatique selon le rôle
  useEffect(() => {
    if (user?.role) {
      switch (user.role) {
        case Role.RECOUVREMENT:
          setActiveTab("paiements");
          break;
        case Role.ADMIN:
          setActiveTab("details");
          break;
        default:
          // Pour tous les autres rôles (MAGASINIER, CHEF_DEPOT, CONTROLEUR, SUPERVISEUR_MAGASIN)
          setActiveTab("livraisons");
          break;
      }
    }
  }, [user?.role]);

  const handleBack = () => {
    router.back();
  };

  // Fonction pour recharger les données après un paiement
  const handlePaymentSuccess = () => {
    // Pour cette page qui utilise des props directes, on peut simplement
    // laisser le composant Paiment gérer sa propre revalidation
    // car il utilise maintenant React Query
    console.log("Paiement ajouté avec succès - revalidation gérée par le composant Paiment");
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

  // Fonction pour ouvrir le dialogue de confirmation d'annulation
  const handleCancelInvoiceClick = () => {
    setIsCancelDialogOpen(true);
  };

  // Fonction pour annuler la facture
  const handleCancelInvoice = async (invoiceId: number) => {
    setIsUpdatingStatus(true);
    setIsCancelDialogOpen(false);
    try {
      await updateInvoiceById({ id: invoiceId, status: InvoiceStatus.ANNULEE });
      toast.success('Facture annulée avec succès');
      window.location.reload();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour du statut');
    } finally {
      setIsUpdatingStatus(false);
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

  return (
    <div className=" w-full px-4 sm:px-6 lg:px-8">
      <div className="flex  flex-col space-y-2 mt-2">
        <div className="flex items-center space-x-4">
          <div className="flex items-center w-full gap-2 justify-end">
            {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
              <>
                {!showSavePaymentButton && (<PaimentDialog 
                  invoiceNumber={invoice.invoiceNumber} 
                  onSuccess={handlePaymentSuccess}
                />
                )}
                {canMarkAsDeliveredWithReturn() && (
                  <Button
                    variant="outline"
                    onClick={() => setIsMarkAsReturnDialogOpen(true)}
                    className="hover:bg-green-100 hover:text-green-700 text-green-600 border-green-200"
                  >
                    <CheckCheck className="h-4 w-4 mr-2" />
                    Marquer livrée
                  </Button>
                )}
                {/* AJOUT : Bouton annuler la facture */}
                {invoice.status !== InvoiceStatus.ANNULEE && invoice.statusPayment !== "payé" && (
                  <Button
                    className="flex ml-2 items-center gap-2 bg-red-400 text-white hover:bg-red-600"
                    onClick={handleCancelInvoiceClick}
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    {isUpdatingStatus ? 'Mise à jour...' : 'Annuler la facture'}
                  </Button>
                )}
                <Button variant="outline" className="flex items-center gap-2" onClick={() => setIsNotificationOpen(true)}>
                  <Bell className="h-4 w-4" /> Ajouter une notification
                </Button>
                <Dialog open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
                  <DialogContent className="bg-white">
                    <DialogTitle>Notification de suivi</DialogTitle>
                    <DialogDescription> Créez un rappel pour la facture {invoice.invoiceNumber}</DialogDescription>
                    <Notification
                      invoiceId={Number(invoice.invoiceNumber)}
                      user={user}
                      onClose={() => setIsNotificationOpen(false)}
                      onSuccess={() => {
                        setIsNotificationOpen(false);
                        // Rafraîchir les données si nécessaire
                      }}
                    />
                  </DialogContent>
                </Dialog>
                {/* AJOUT : Dialogue de confirmation d'annulation */}
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
              </>
            )}
          </div>
        </div>

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
                  <CheckCheck className="mr-2 h-4 w-4" />
                )}
                {isMarkingAsReturn ? 'Marquage en cours...' : 'Marquer comme livrée'}
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
            {user && user.role === "RECOUVREMENT" && (
              <TabsTrigger
                value="paiements"
                className="flex-1 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Suivi des paiements
              </TabsTrigger>
            )}
            {/* {user && user.role === "RECOUVREMENT" && (
              <TabsTrigger
                value="rappels"
                className="flex-1 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700"
              >
                <Bell className="w-4 h-4 mr-2" />
                Historique des rappels
              </TabsTrigger>
            )} */}
          </TabsList>
          <Detail invoice={invoice} userRole={user?.role} />
          <Delivery invoice={invoice} activeTab={activeTab} />
          {user && user.role === "RECOUVREMENT" && (
            <Paiment invoice={invoice} user={user} />
          )}
          {user && user.role === "RECOUVREMENT" && (
            <Reminder />
          )}
        </Tabs>
      </div>
    </div>
  );
}