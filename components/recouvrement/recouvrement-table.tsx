"use client"

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Bell, Check, Eye, Loader2, FileX, Download, Copy, Check as CheckIcon } from "lucide-react"

import Filtre from "../facture/filtre"

import { useState, useMemo } from "react"
import { Invoice } from "@/lib/types"
import { useSearchParams } from "next/navigation"
import { Role } from "@/types/roles"
import { exportFilteredToExcel } from "@/lib/excel-export"
import { toast } from "@/components/ui/use-toast"
import { InvoiceStatus } from "@/types/enums"

interface RecouvrementTableProps {
  factures: Invoice[];
  user: any;
  isLoading?: boolean;
  depots: any[];
  statistics?: {
    total: {
      count: number;
      amount: number;
    };
    byStatus: Record<string, { count: number; amount: number }>;
  };
}

export default function RecouvrementTable({ factures, user, isLoading = false, depots, statistics }: RecouvrementTableProps) {
  console.log({ factures })
  const searchParams = useSearchParams()
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Récupération des paramètres directement depuis l'URL
  const paymentStatus = searchParams.get('paymentStatus') || "tous";
  const deliveryStatus = searchParams.get('status') || "tous";
  const searchQuery = searchParams.get('search') || "";
  const selectedDepot = searchParams.get('depot') || "tous";

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
      // Statuts de livraison selon l'enum InvoiceStatus
      "EN ATTENTE DE LIVRAISON": "bg-amber-100 text-amber-700 border-amber-200",
      "EN COURS DE LIVRAISON": "bg-blue-100 text-blue-700 border-blue-200",
      "LIVRÉE": "bg-green-100 text-green-800 border-green-200",
      "RETOUR": "bg-red-100 text-red-700 border-red-200",
      "RÉGULE": "bg-purple-100 text-purple-700 border-purple-200",
      // Statuts de paiement
      "PAYÉ": "bg-green-100 w-[80px] items-center justify-center rounded-none text-green-700 border-green-200",
      "NON PAYÉ": "bg-red-100 rounded-none text-red-700 border-red-200",
      "PAIEMENT PARTIEL": "bg-white rounded-none text-blue-700 border-blue-200",
      // Statut par défaut
      default: "bg-gray-100 text-gray-700 border-gray-200"
    };
    const upperStatus = status.toUpperCase();
    return colors[upperStatus as keyof typeof colors] || colors.default;
  };

  const getStatisticsColor = (status: string) => {
    const colors = {
      // Statuts de livraison selon l'enum InvoiceStatus
      "NON RÉCEPTIONNÉE": "bg-gray-50 border-gray-200 text-gray-800",
      "RETOUR": "bg-red-50 border-red-200 text-red-800",
      "EN ATTENTE DE LIVRAISON": "bg-amber-50 border-amber-200 text-amber-800",
      "EN COURS DE LIVRAISON": "bg-blue-50 border-blue-200 text-blue-800",
      "LIVRÉE": "bg-green-50 border-green-200 text-green-800",
      "RÉGULE": "bg-purple-50 border-purple-200 text-purple-800",
      // Statuts de paiement
      "PAYÉ": "bg-green-50 border-green-200 text-green-800",
      "NON PAYÉ": "bg-red-50 border-red-200 text-red-800",
      "PAIEMENT PARTIEL": "bg-blue-50 border-blue-200 text-blue-800",
      // Statut par défaut
      default: "bg-gray-50 border-gray-200 text-gray-800"
    };
    const upperStatus = status.toUpperCase();
    return colors[upperStatus as keyof typeof colors] || colors.default;
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await exportFilteredToExcel(
        { factures, user },
        {
          searchQuery,
          paymentStatus,
          deliveryStatus,
          selectedDepot
        }
      );

      toast({
        title: "Export réussi",
        description: "Le fichier Excel a été téléchargé avec succès.",
      });
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast({
        title: "Erreur d'export",
        description: "Une erreur s'est produite lors de l'export. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async (text: string, fieldType: string, factureId: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(`${fieldType}-${factureId}`);
      toast({
        title: "Copié !",
        description: `${fieldType} copié dans le presse-papiers.`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
      toast({
        title: "Erreur de copie",
        description: "Impossible de copier dans le presse-papiers.",
        variant: "destructive",
      });
    }
  };

  // Filtrage optimisé avec useMemo pour éviter les recalculs inutiles
  const filteredFactures = useMemo(() => {
    return factures.filter((facture) => {
      const matchesPaymentStatus =
        paymentStatus === "tous" ||
        facture.statusPayment === paymentStatus;

      const matchesDeliveryStatus =
        deliveryStatus === "tous" ||
        facture.status === deliveryStatus;

      const matchesDepot =
        selectedDepot === "tous" ||
        facture.depotId?.toString() === selectedDepot;

      return matchesPaymentStatus && matchesDeliveryStatus && matchesDepot;
    });
  }, [factures, paymentStatus, deliveryStatus, selectedDepot]);

  return (
    <>
      <div>
        <Filtre
          user={user}
          depots={depots}
          onStatusChange={() => { }}
          onSearch={() => { }}
          currentStatus={deliveryStatus}
          searchValue={searchQuery}
          onDateChange={() => { }}
          onPaymentStatusChange={() => { }}
        />
      </div>
      <div className="overflow-x-auto border rounded-lg">
        <div className="p-3">
          {/* En-tête avec bouton d'export et statistiques */}
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-4">

              {/* Statistiques compactes */}
              {statistics && (
                <div className="flex flex-wrap gap-1">
                  {/* Total */}
                  <div className="bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 px-2 py-1 rounded-md shadow-sm min-w-[60px]">
                    <div className="text-center">
                      <span className="text-xs font-medium text-primary-600 uppercase tracking-wide block">Total</span>
                      <span className="text-sm font-bold text-primary-900">{statistics.total.count}</span>
                    </div>
                  </div>

                  {/* Statistiques par statut */}
                  {Object.entries(statistics.byStatus).map(([status, stats]) => (
                    <div key={status} className={`border px-2 py-1 rounded-md shadow-sm ${getStatisticsColor(status)} ${stats.count === 0 ? 'opacity-60' : ''} min-w-[60px]`}>
                      <div className="text-center">
                        <span className="text-xs font-medium uppercase tracking-wide opacity-80 block truncate">
                          {status.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-bold">{stats.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
              <Button
                onClick={handleExportExcel}
                variant="outline"
                size="sm"
                className="hover:bg-primary-700 hover:text-white font-bold bg-white text-primary-700 transition-colors duration-300 transform hover:scale-105"
                disabled={isLoading || filteredFactures.length === 0 || isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isExporting ? 'Export en cours...' : 'Exporter Excel'}
              </Button>
            )}
          </div>
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
                  <TableHead className="font-semibold text-primary-900">Date de livraison</TableHead>
                  <TableHead className="font-semibold text-primary-900">État livraison</TableHead>
                  {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && <TableHead className="font-semibold text-primary-900">État paiement</TableHead>}
                  {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && <TableHead className="font-semibold text-primary-900">Montant restant à payer</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFactures.map((facture) => (
                  <TableRow
                    key={facture.id}
                    className="hover:bg-primary-50/30 cursor-pointer transition-colors duration-200 group"
                    onClick={() => {
                      const href = user && user.role !== Role.ADMIN
                        ? `/factures/${facture.invoiceNumber}`
                        : `/dashboard/invoices/${facture.invoiceNumber}`;
                      window.location.href = href;
                    }}
                  >
                    <TableCell>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{facture.invoiceNumber}</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipContent>
                              <p>Copier le numéro de facture</p>
                            </TooltipContent>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyToClipboard(facture.invoiceNumber, "Numéro de facture", facture.id);
                              }}
                            >
                              {copiedField === `Numéro de facture-${facture.id}` ? (
                                <CheckIcon className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{facture.accountNumber}</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipContent>
                              <p>Copier le numéro de compte</p>
                            </TooltipContent>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyToClipboard(facture.accountNumber, "Numéro de compte", facture.id);
                              }}
                            >
                              {copiedField === `Numéro de compte-${facture.id}` ? (
                                <CheckIcon className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(facture.date)}</TableCell>
                    <TableCell>{facture.customer?.name}</TableCell>
                    <TableCell>
                      {facture.deliveredAt ? (
                        <span className="text-green-600 font-medium">
                          {formatDate(facture.deliveredAt.toString())}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Non livrée</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(facture.status)}>
                        {facture.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && <TableCell>
                      {facture.status !== InvoiceStatus.RETOUR ? <Badge className={getStatusColor(facture.statusPayment || "non_paye")}>
                        {(facture.statusPayment || "non_paye").replace("_", " ").toUpperCase()}
                      </Badge> : "-"}
                    </TableCell>}
                    {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-lg flex items-center gap-1">
                          {facture.statusPayment?.toUpperCase() === "PAYÉ"
                            ? <>
                              {formatMontant(0)}
                              {facture.remainingAmount < 0 && (
                                <span className="text-green-600 text-xs font-semibold ml-1">
                                  +{formatMontant(Math.abs(Number(facture.remainingAmount)))}
                                </span>
                              )}
                            </>
                            : formatMontant(facture.remainingAmount || 0)}
                        </span>
                      </div>
                    </TableCell>}
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