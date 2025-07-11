"use client"

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Bell, Check, Eye, Loader2, FileX, Download } from "lucide-react"
import Link from "next/link"
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
        />
      </div>
      <div className="overflow-x-auto border rounded-lg">
        <div className="space-y-5 flex flex-col lg:flex-row justify-between items-start lg:items-center p-4 gap-4">
          {/* Statistiques */}
          {statistics && (
            <div className="flex flex-wrap gap-3 items-center">
              {/* Total */}
              <div className="flex items-center gap-3 bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 px-4 py-3 rounded-xl shadow-sm">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-primary-600 uppercase tracking-wide">Total</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-primary-900">{statistics.total.count}</span>
                    <span className="text-sm text-primary-700">factures</span>
                  </div>
                  <span className="text-lg font-semibold text-primary-800">{formatMontant(statistics.total.amount)}</span>
                </div>
              </div>

              {/* Statistiques par statut */}
              {Object.entries(statistics.byStatus).map(([status, stats]) => (
                <div key={status} className={`flex items-center gap-3 border px-4 py-3 rounded-xl shadow-sm ${getStatisticsColor(status)} ${stats.count === 0 ? 'opacity-60' : ''}`}>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium uppercase tracking-wide opacity-80">
                      {status.replace('_', ' ')}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold">{stats.count}</span>
                      <span className="text-sm opacity-80">factures</span>
                    </div>
                    <span className="text-base font-semibold">{formatMontant(stats.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bouton Export */}
          {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
            <div className="flex-shrink-0">
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
            </div>
          )}
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
                  {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && <TableHead className="font-semibold text-primary-900">Date échéance</TableHead>}
                  <TableHead className="font-semibold text-primary-900">État livraison</TableHead>
                  {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && <TableHead className="font-semibold text-primary-900">État paiement</TableHead>}
                  {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && <TableHead className="font-semibold text-primary-900">Montant restant à payer</TableHead>}
                  <TableHead className="font-semibold text-primary-900">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFactures.map((facture) => (
                  <TableRow key={facture.id} className=" hover:bg-primary-50/30">
                    <TableCell>
                    </TableCell>
                    <TableCell className="font-medium">

                      {facture.invoiceNumber}

                    </TableCell>
                    <TableCell>{facture.accountNumber}</TableCell>
                    <TableCell>{formatDate(facture.date)}</TableCell>
                    <TableCell>{facture.customer?.name}</TableCell>
                    {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && <TableCell>{formatDate(facture.date)}</TableCell>}
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
                    <TableCell>
                      <div className="flex gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipContent>
                              <p>Ajouter une notification</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={user && user.role !== Role.ADMIN ? `/factures/${facture.invoiceNumber}` : `/dashboard/invoices/${facture.invoiceNumber}`} className="flex items-center gap-2">
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