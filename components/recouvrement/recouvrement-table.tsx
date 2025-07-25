"use client"

import React, { useState, useMemo, useEffect, useRef } from "react"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Bell, Check, Eye, Loader2, FileX, Download, Copy, Check as CheckIcon, PlusCircle, CheckCircle, XCircle, ChevronUp, ChevronDown } from "lucide-react"

import Filtre from "../facture/filtre"
import PaiementInlineForm from "./PaiementInlineForm";

import { Invoice } from "@/lib/types"
import { useSearchParams } from "next/navigation"
import { Role } from "@/types/roles"
import { exportFilteredToExcel } from "@/lib/excel-export"
import { toast } from "@/components/ui/use-toast"
import { InvoiceStatus, InvoicePaymentStatus } from "@/types/enums"
import { PaymentMethod } from "@/types/enums"
import { useRouter } from "next/navigation";

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
  onPaymentSuccess?: (updatedFacture: Invoice, invoiceNumber: string) => void;
}

export default function RecouvrementTable({ factures: invoices, user, isLoading = false, depots, statistics, onPaymentSuccess }: RecouvrementTableProps) {
  const factures = invoices;
  const router = useRouter();
  console.log({ factures })
  const searchParams = useSearchParams()
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [returnPaymentsData, setReturnPaymentsData] = useState<Record<string, number>>({});

  // Ajout des états pour le formulaire de paiement inline
  const [openPaymentRow, setOpenPaymentRow] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [paymentComment, setPaymentComment] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  // Ajout d'un état pour le feedback de succès/erreur par ligne
  const [successRow, setSuccessRow] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Tri multi-colonnes
  const [sortConfig, setSortConfig] = useState<{
    column: string | null;
    order: "asc" | "desc" | null;
  }>({ column: null, order: null });

  // Récupération des paramètres directement depuis l'URL
  const paymentStatus = searchParams.get('paymentStatus') || "tous";
  const deliveryStatus = searchParams.get('status') || "tous";
  const searchQuery = searchParams.get('search') || "";
  const selectedDepot = searchParams.get('depot') || "tous";

  // Supprimer le useEffect de récupération des paiements de retour

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
      "RETOUR": "text-gray-800  bg-transparent border-gray-300",
      "ANNULÉE": "text-gray-800  bg-transparent border-gray-300",
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
      // Vérifier si on est côté client et si les APIs sont disponibles
      if (typeof window === 'undefined') {
        throw new Error('Fonction copie non disponible côté serveur');
      }

      // Vérifier si on est en contexte sécurisé (HTTPS ou localhost)
      const isSecureContext = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

      // Vérifier si l'API Clipboard moderne est disponible
      if (isSecureContext && typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
          await navigator.clipboard.writeText(text);
        } catch (clipboardError) {
          // Si l'API Clipboard échoue, utiliser le fallback
          console.warn('API Clipboard échouée, utilisation du fallback:', clipboardError);
          throw clipboardError;
        }
      } else {
        // Méthode de fallback pour les contextes non sécurisés ou APIs non disponibles
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.style.opacity = '0';
        textArea.style.pointerEvents = 'none';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (!successful) {
          throw new Error('Fallback copy method failed');
        }
      }

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
        description: "Impossible de copier dans le presse-papiers. Vérifiez que votre navigateur autorise l'accès au presse-papiers.",
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

  // Fonction pour gérer le tri
  const handleSort = (column: string) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        if (prev.order === "asc") return { column, order: "desc" };
        if (prev.order === "desc") return { column: null, order: null };
        return { column, order: "asc" };
      }
      return { column, order: "asc" };
    });
  };

  // Tri multi-colonnes
  const sortedFactures = useMemo(() => {
    let data = [...filteredFactures];
    if (sortConfig.column && sortConfig.order) {
      data.sort((a, b) => {
        let valueA: any;
        let valueB: any;

        switch (sortConfig.column) {
          case "invoiceDate":
            valueA = new Date(a.date).getTime();
            valueB = new Date(b.date).getTime();
            break;
          case "deliveryDate":
            valueA = a.lastValidatedBl?.createdAt
              ? new Date(a.lastValidatedBl.createdAt).getTime()
              : a.deliveredAt
                ? new Date(a.deliveredAt).getTime()
                : 0;
            valueB = b.lastValidatedBl?.createdAt
              ? new Date(b.lastValidatedBl.createdAt).getTime()
              : b.deliveredAt
                ? new Date(b.deliveredAt).getTime()
                : 0;
            break;
          case "age":
            valueA = a.deliveredSince || 0;
            valueB = b.deliveredSince || 0;
            break;
          case "remainingAmount":
            valueA = a.remainingAmount || 0;
            valueB = b.remainingAmount || 0;
            break;
          default:
            return 0;
        }

        if (sortConfig.order === "asc") {
          return valueA - valueB;
        } else {
          return valueB - valueA;
        }
      });
    }
    return data;
  }, [filteredFactures, sortConfig]);

  const montantInputRef = useRef<HTMLInputElement>(null);
  const [paymentProgress, setPaymentProgress] = useState<number>(0);

  useEffect(() => {
    if (openPaymentRow && montantInputRef.current) {
      montantInputRef.current.focus();
      // Pré-remplir avec le montant restant
      const facture = factures.find(f => f.invoiceNumber === openPaymentRow);
      if (facture) {
        setPaymentAmount(facture.remainingAmount.toString());
      }
    }
  }, [openPaymentRow, factures]);

  const paymentRowRef = useRef<HTMLTableCellElement>(null);

  // Fermer le formulaire si clic en dehors
  useEffect(() => {
    if (!openPaymentRow) return;
    function handleClickOutside(event: MouseEvent) {
      if (paymentRowRef.current && !paymentRowRef.current.contains(event.target as Node)) {
        setOpenPaymentRow(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openPaymentRow]);

  // Callback pour rafraîchir la page après paiement
  const handlePaymentSuccess = (updatedFacture: Invoice, invoiceNumber: string) => {
    setOpenPaymentRow(null);
    setTimeout(() => setSuccessRow(null), 2000);
    if (onPaymentSuccess) {
      onPaymentSuccess(updatedFacture, invoiceNumber);
    } else {
      router.refresh();
    }
  };

  // Ajoute une fonction pour la couleur de fond du rond d'âge
  const getAgeBgColor = (age: number) => {
    if (age <= 2) return "bg-green-100 text-green-800";
    if (age <= 7) return "bg-amber-100 text-amber-800";
    if (age <= 15) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

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
                  <TableHead className="font-semibold text-primary-900">
                    <div className="flex items-center justify-between">
                      <span>Date facture</span>
                      <button
                        type="button"
                        className="text-primary-700 hover:text-primary-900 focus:outline-none"
                        onClick={() => handleSort("invoiceDate")}
                        title="Trier par date de facturation"
                      >
                        {sortConfig.column === "invoiceDate" && sortConfig.order === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : sortConfig.column === "invoiceDate" && sortConfig.order === "desc" ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4 opacity-30" />
                        )}
                      </button>
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-primary-900">Client</TableHead>
                  <TableHead className="font-semibold text-primary-900">
                    <div className="flex items-center justify-between">
                      <span>Date de livraison</span>
                      <button
                        type="button"
                        className="text-primary-700 hover:text-primary-900 focus:outline-none"
                        onClick={() => handleSort("deliveryDate")}
                        title="Trier par date de livraison"
                      >
                        {sortConfig.column === "deliveryDate" && sortConfig.order === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : sortConfig.column === "deliveryDate" && sortConfig.order === "desc" ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4 opacity-30" />
                        )}
                      </button>
                    </div>
                  </TableHead>
                  {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
                    <TableHead className="font-semibold text-primary-900">
                      <div className="flex items-center justify-between">
                        <span>Âge</span>
                        <button
                          type="button"
                          className="text-primary-700 hover:text-primary-900 focus:outline-none"
                          onClick={() => handleSort("age")}
                          title="Trier par âge"
                        >
                          {sortConfig.column === "age" && sortConfig.order === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : sortConfig.column === "age" && sortConfig.order === "desc" ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4 opacity-30" />
                          )}
                        </button>
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="font-semibold text-primary-900">État livraison</TableHead>
                  {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && <TableHead className="font-semibold text-primary-900">État paiement</TableHead>}
                  {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
                    <TableHead className="font-semibold text-primary-900">
                      <div className="flex items-center justify-between">
                        <span>Montant restant à payer</span>
                        <button
                          type="button"
                          className="text-primary-700 hover:text-primary-900 focus:outline-none"
                          onClick={() => handleSort("remainingAmount")}
                          title="Trier par montant restant"
                        >
                          {sortConfig.column === "remainingAmount" && sortConfig.order === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : sortConfig.column === "remainingAmount" && sortConfig.order === "desc" ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4 opacity-30" />
                          )}
                        </button>
                      </div>
                    </TableHead>
                  )}
                  {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
                    <TableHead className="font-semibold text-primary-900">Action</TableHead>
                  )}
                  {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
                    <TableHead className="font-semibold text-primary-900">Détail</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedFactures.map((facture) => {
                  const totalReturnPayments = facture.totalReturnPayments || 0;
                  const isPaymentOpen = openPaymentRow === facture.invoiceNumber;
                  const montantPaye = facture.totalTtc - facture.remainingAmount;
                  return (
                    <React.Fragment key={facture.id}>
                      <TableRow
                        key={facture.id}
                        className={
                          isPaymentOpen
                            ? "z-10 ring-2 ring-primary-400 shadow-xl bg-white"
                            : openPaymentRow
                              ? "opacity-50 pointer-events-none blur-[1.5px] select-none"
                              : "hover:bg-primary-50/30 transition-colors duration-200 group"
                        }
                        style={{ transition: 'all 0.2s' }}
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
                          {facture.lastValidatedBl ? (
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-500 2xl:text-sm text-primary-700">
                                {formatDate(facture.lastValidatedBl.createdAt)}
                              </span>
                            </div>
                          ) : facture.deliveredAt ? (
                            <span className="text-green-600 font-medium 2xl:text-sm text-green-700">
                              {formatDate(facture.deliveredAt.toString())}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Non livrée</span>
                          )}
                        </TableCell>
                        {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
                          <TableCell>
                            {facture.status === InvoiceStatus.LIVREE && facture.statusPayment === InvoicePaymentStatus.NON_PAYE ? (
                              <>
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm bg-red-100 text-red-600`}>
                                  {`${facture.deliveredSince}`}
                                </span>
                                <span className="text-xs text-red-600"> {facture.deliveredSince === 1 ? "jour" : "jours"}</span></>
                            ) : (
                              <span className="text-gray-400 italic">-</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge className={getStatusColor(facture.status)}>
                            {facture.status.replace("_", " ").toUpperCase()}
                          </Badge>
                        </TableCell>
                        {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && <TableCell>
                          {facture.status !== InvoiceStatus.RETOUR && facture.status !== InvoiceStatus.ANNULEE ? <Badge className={getStatusColor(facture.statusPayment || "non_paye")}>
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
                              {totalReturnPayments > 0 && (
                                <span className="text-red-600 text-xs font-semibold ml-1">
                                  -{formatMontant(totalReturnPayments)}
                                </span>
                              )}
                            </span>
                          </div>
                        </TableCell>}
                        {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
                          <TableCell>
                            {!isPaymentOpen ? (
                              ![InvoiceStatus.RETOUR, InvoiceStatus.REGULE, InvoiceStatus.ANNULEE].includes(facture.status) ? (
                                <Button size="sm" variant="outline" className="flex items-center gap-1" onClick={e => { e.stopPropagation(); setOpenPaymentRow(facture.invoiceNumber); setPaymentAmount(""); setPaymentMethod(""); setPaymentComment(""); setErrorMsg(""); }}>
                                  <PlusCircle className="w-4 h-4 mr-1 text-primary-600" /> Ajouter paiement
                                </Button>
                              ) : (
                                <span className="text-gray-400 italic flex justify-center">-</span>
                              )
                            ) : null}
                            {successRow === facture.invoiceNumber && (
                              <span className="flex items-center text-green-600 text-xs mt-1 animate-fade-in">
                                <CheckCircle className="w-4 h-4 mr-1" /> Paiement ajouté !
                              </span>
                            )}
                          </TableCell>
                        )}
                        {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-700 hover:text-blue-900"
                              onClick={e => {
                                e.stopPropagation();
                                const href = user && user.role !== Role.ADMIN
                                  ? `/factures/${facture.invoiceNumber}`
                                  : `/dashboard/invoices/${facture.invoiceNumber}`;
                                window.location.href = href;
                              }}
                              title="Voir le détail de la facture"
                            >
                              <Eye className="w-5 h-5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                      {isPaymentOpen && (
                        <PaiementInlineForm
                          facture={facture}
                          isOpen={isPaymentOpen}
                          onClose={() => setOpenPaymentRow(null)}
                          montantPaye={montantPaye}
                          onSuccess={(updatedFacture) => handlePaymentSuccess(updatedFacture, facture.invoiceNumber)}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
}