"use client"

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Bell, Check, Eye, Loader2, FileX } from "lucide-react"
import Link from "next/link"
import Filtre from "../facture/filtre"
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "../ui/dialog"
import Notification from "../notification-dialog"
import { useState } from "react"
import { Invoice } from "@/lib/types"
import { useSearchParams } from "next/navigation"
import { getCurrentUser } from "@/actions/user"
import { Role } from "@/types/roles"

interface RecouvrementTableProps {
  factures: Invoice[];
  user: any;
  isLoading?: boolean;
  depots: any[];
}

export default function RecouvrementTable({ factures, user, isLoading = false, depots }: RecouvrementTableProps) {


  const searchParams = useSearchParams()
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [paymentStatus, setPaymentStatus] = useState(searchParams.get('paymentStatus') || "tous");
  const [deliveryStatus, setDeliveryStatus] = useState(searchParams.get('status') || "tous");
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || "");
  const [selectedDepot, setSelectedDepot] = useState(searchParams.get('depot') || "tous");

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(montant);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  const getStatusColor = (status: string) => {
    const colors = {
      // Statuts de livraison
      "EN ATTENTE DE LIVRAISON": "bg-amber-100 text-amber-700 border-amber-200",
      "LIVRE": " bg-green-100 text-green-700 border-green-200 ",
      "EN COURS DE LIVRAISON": " bg-white text-blue-700 border-blue-200 ",
      "LIVRAISON PARTIELLE": "bg-blue-100 text-blue-700 border-blue-200 ",
      // Statuts de paiement
      "PAYÉ": " bg-green-100 w-[80px] items-center justify-center rounded-none text-green-700 border-green-200 ",
      "NON PAYÉ": " bg-red-100 rounded-none text-red-700 border-red-200 ",
      "PAIEMENT PARTIEL": "bg-white rounded-none text-blue-700 border-blue-200",
      // Statut par défaut
      default: "bg-gray-100 text-gray-700 border-gray-200"
    };
    const upperStatus = status.toUpperCase();
    return colors[upperStatus as keyof typeof colors] || colors.default;
  };

  const handlePaymentStatusChange = (status: string) => {
    setPaymentStatus(status);
  };

  const handleDeliveryStatusChange = (status: string) => {
    setDeliveryStatus(status);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleDepotChange = (depotId: string) => {
    setSelectedDepot(depotId);
  };

  const filteredFactures = factures.filter((facture) => {
    const matchesSearch =
      facture.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      facture.accountNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      facture.customer?.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPaymentStatus =
      paymentStatus === "tous" ||
      facture.statusPayment === paymentStatus;

    const matchesDeliveryStatus =
      deliveryStatus === "tous" ||
      facture.status === deliveryStatus;

    const matchesDepot =
      selectedDepot === "tous" ||
      facture.depotId?.toString() === selectedDepot;

    return matchesSearch && matchesPaymentStatus && matchesDeliveryStatus && matchesDepot;
  });

  return (
    <>
      <div>
        <Filtre
          onStatusChange={handleDeliveryStatusChange}
          onSearch={handleSearch}
          currentStatus={deliveryStatus}
          searchValue={searchQuery}
          onDateChange={() => { }}
          onPaymentStatusChange={handlePaymentStatusChange}
          onDepotChange={handleDepotChange}
          user={user}
          depots={depots}
        />
      </div>
      <div className="overflow-x-auto border rounded-lg">
        <div className="space-y-5 flex justify-end p-4">
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredFactures.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
              <FileX className="h-12 w-12 mb-4" />
              <h3 className="text-lg font-medium">Aucune facture trouvée</h3>
              <p className="text-sm">Il n'y a pas de factures correspondant à vos critères de recherche.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow className="bg-primary-50/50 ">
                  <TableHead className="w-[50px]">
                  </TableHead>
                  <TableHead className="font-semibold text-primary-900">Numéro facture</TableHead>
                  <TableHead className="font-semibold text-primary-900">Numéro compte</TableHead>
                  <TableHead className="font-semibold text-primary-900">Date facture</TableHead>
                  <TableHead className="font-semibold text-primary-900">Client</TableHead>
                  {(user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && <TableHead className="font-semibold text-primary-900">Date échéance</TableHead>}
                  <TableHead className="font-semibold text-primary-900">État livraison</TableHead>
                  {(user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && <TableHead className="font-semibold text-primary-900">État paiement</TableHead>}
                  {(user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && <TableHead className="font-semibold text-primary-900">Montant restant à payer</TableHead>}
                  <TableHead className="font-semibold text-primary-900">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFactures.map((facture) => (
                  <TableRow key={facture.id} className=" hover:bg-primary-50/30">
                    <TableCell>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/factures/${facture.id}`} className="hover:text-primary transition-colors">
                        {facture.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{facture.accountNumber}</TableCell>
                    <TableCell>{formatDate(facture.date)}</TableCell>
                    <TableCell>{facture.customer?.name}</TableCell>
                    {user.role === Role.RECOUVREMENT || user.role === Role.ADMIN && <TableCell>{formatDate(facture.date)}</TableCell>}
                    <TableCell>
                      <Badge className={getStatusColor(facture.status)}>
                        {facture.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    {user.role === Role.RECOUVREMENT || user.role === Role.ADMIN && <TableCell>
                      <Badge className={getStatusColor(facture.statusPayment || "non_paye")}>
                        {(facture.statusPayment || "non_paye").replace("_", " ").toUpperCase()}
                      </Badge>
                    </TableCell>}
                    {user.role === Role.RECOUVREMENT || user.role === Role.ADMIN && <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-lg">
                          {formatMontant(Number(facture.remainingAmount) || 0)}
                        </span>
                      </div>
                    </TableCell>}
                    <TableCell>
                      <div className="flex gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            {/* <Dialog> */}
                            {/* <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="hover:bg-amber-50">
                                  <Bell className="h-4 w-4 text-amber-600" />
                                </Button>
                              </DialogTrigger> */}
                            {/* <DialogContent className="bg-white sm:max-w-[425px]">
                                <DialogTitle>Notification de suivi</DialogTitle>
                                <DialogDescription>
                                  Créez un rappel pour la facture {facture.invoiceNumber}
                                </DialogDescription>
                                <Notification
                                  invoiceId={Number(facture.id)}
                                  user={user}
                                  onClose={() => {
                                    const closeButton = document.querySelector('[data-state="open"] button[aria-label="Close"]');
                                    if (closeButton instanceof HTMLElement) {
                                      closeButton.click();
                                    }
                                  }}
                                  onSuccess={() => {
                                    const closeButton = document.querySelector('[data-state="open"] button[aria-label="Close"]');
                                    if (closeButton instanceof HTMLElement) {
                                      closeButton.click();
                                    }
                                  }}
                                />
                              </DialogContent>
                            </Dialog> */}
                            <TooltipContent>
                              <p>Ajouter une notification</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={user.role !== Role.ADMIN ? `/factures/${facture.invoiceNumber}` : `/dashboard/invoices/${facture.invoiceNumber}`} className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Détails
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
}