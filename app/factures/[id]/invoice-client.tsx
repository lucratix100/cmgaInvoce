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
} from "@/components/ui/dialog";
import { Invoice } from "@/lib/types";
import Detail from "@/components/factureId/detail";
import Delivery from "@/components/factureId/delivery";
import { Role } from "@/types/roles";

interface InvoiceClientProps {
  invoice: Invoice;
  user: any;
}

export default function InvoiceClient({ invoice, user }: InvoiceClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("details");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

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

  return (
    <div className=" w-full px-4 sm:px-6 lg:px-8">
      <div className="flex  flex-col space-y-2 mt-2">
        <div className="flex items-center space-x-4">
          <Button onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Retour aux factures
          </Button>
          <div className="flex items-center w-full gap-2 justify-end">
            {user && user.role === "RECOUVREMENT" && (
              <>
                <PaimentDialog invoiceNumber={invoice.invoiceNumber} />
                <Button variant="outline" className="flex items-center gap-2" onClick={() => setIsNotificationOpen(true)}>
                  <Bell className="h-4 w-4" /> Ajouter une notification
                </Button>
                <Dialog open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
                  <DialogContent className="bg-white">
                    <DialogTitle>Notification de suivi</DialogTitle>
                    <DialogDescription>Créez un rappel pour la facture {invoice.invoiceNumber}</DialogDescription>
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
              </>
            )}
          </div>
        </div>
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
            <Paiment invoice={invoice} />
          )}
          {user && user.role === "RECOUVREMENT" && (
            <Reminder />
          )}
        </Tabs>
      </div>
    </div>
  );
}