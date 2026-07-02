"use client"

import React, { useState, useMemo, useEffect, useRef } from "react"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Bell, Check, Eye, Loader2, FileX, Download, Copy, Check as CheckIcon, PlusCircle, CheckCircle, XCircle, Truck } from "lucide-react"

import Filtre from "../facture/filtre"
import PaiementInlineForm from "./PaiementInlineForm";
import GestionFacture from "../facture/gestion-facture";
import InvoiceConfirmationDialog from "../invoice-scan-confirmation-dialog";

import { Invoice } from "@/lib/types"
import { useSearchParams } from "next/navigation"
import { Role } from "@/types/roles"
import { exportFilteredToExcel } from "@/lib/excel-export"
import { toast } from "@/components/ui/use-toast"
import { InvoiceStatus, InvoicePaymentStatus } from "@/types/enums"
import { PaymentMethod } from "@/types/enums"
import { useRouter } from "next/navigation";
import { getInvoiceByNumber } from "@/actions/invoice";
import { addPayment } from "@/actions/payment";

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
  disableDefaultDate?: boolean;
}

export default function RecouvrementTable({ factures: invoices, user, isLoading = false, depots, statistics, onPaymentSuccess, disableDefaultDate = false }: RecouvrementTableProps) {
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

  // Nouvel état pour l'input de montant inline
  const [inlinePaymentRow, setInlinePaymentRow] = useState<string | null>(null);
  const [inlinePaymentAmount, setInlinePaymentAmount] = useState("");

  // États pour le dialog GestionFacture
  const [isGestionFactureOpen, setIsGestionFactureOpen] = useState(false);
  const [selectedFactureNumber, setSelectedFactureNumber] = useState<string>("");

  // États pour le dialog de confirmation de facture
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);
  const [selectedFactureForConfirmation, setSelectedFactureForConfirmation] = useState<any>(null);
  const [isCheckingInvoiceStatus, setIsCheckingInvoiceStatus] = useState(false);

  // Tri multiple
  const [sortField, setSortField] = useState<"deliveryDate" | "invoiceDate" | "age" | "remainingAmount" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

  // Récupération des paramètres directement depuis l'URL
  const paymentStatus = searchParams.get('paymentStatus') || "tous";
  const deliveryStatus = searchParams.get('status') || "tous";
  const searchQuery = searchParams.get('search') || "";
  const selectedDepot = searchParams.get('depot') || "tous";
  const canViewPaymentInfo = Boolean(user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN));

  const isPaymentStatistic = (status: string) => {
    const normalizedStatus = status
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();

    return normalizedStatus.includes("PAYE") || normalizedStatus.includes("PAIEMENT");
  };

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

  const handleSort = (field: "deliveryDate" | "invoiceDate" | "age" | "remainingAmount") => {
    if (sortField === field) {
      // Même champ : changer l'ordre
      setSortOrder(prev => prev === "asc" ? "desc" : prev === "desc" ? null : "asc");
      if (sortOrder === "desc") {
        setSortField(null);
      }
    } else {
      // Nouveau champ : commencer par asc
      setSortField(field);
      setSortOrder("asc");
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
        !canViewPaymentInfo ||
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
  }, [factures, paymentStatus, deliveryStatus, selectedDepot, canViewPaymentInfo]);

  const sortedFactures = useMemo(() => {
    let data = [...filteredFactures];
    if (sortField && sortOrder) {
      data.sort((a, b) => {
        let valueA: number | string;
        let valueB: number | string;

        switch (sortField) {
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
            valueA = a.deliveredSince ?? -1;
            valueB = b.deliveredSince ?? -1;
            break;
          case "remainingAmount":
            valueA = Number(a.remainingAmount) || 0;
            valueB = Number(b.remainingAmount) || 0;
            break;
          default:
            return 0;
        }

        if (typeof valueA === "number" && typeof valueB === "number") {
          return sortOrder === "asc" ? valueA - valueB : valueB - valueA;
        }
        return 0;
      });
    }
    return data;
  }, [filteredFactures, sortField, sortOrder]);

  const montantInputRef = useRef<HTMLInputElement>(null);
  const inlineMontantInputRef = useRef<HTMLInputElement>(null);
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

  // Focus sur l'input inline quand il s'ouvre
  useEffect(() => {
    if (inlinePaymentRow && inlineMontantInputRef.current) {
      inlineMontantInputRef.current.focus();
      // Pré-remplir avec le montant restant formaté (avec espaces)
      const facture = factures.find(f => f.invoiceNumber === inlinePaymentRow);
      if (facture) {
        const formattedAmount = facture.remainingAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        setInlinePaymentAmount(formattedAmount);
      }
    }
  }, [inlinePaymentRow, factures]);

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

  // Fermer l'input inline si clic en dehors
  useEffect(() => {
    if (!inlinePaymentRow) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (inlineMontantInputRef.current && !inlineMontantInputRef.current.contains(target)) {
        setInlinePaymentRow(null);
        setInlinePaymentAmount("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inlinePaymentRow]);

  // Gestion du raccourci clavier Ctrl+E pour l'export Excel
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Vérifier si Ctrl+E est pressé et si l'utilisateur a les permissions
      if (event.ctrlKey && event.key === 'e' && user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN)) {
        event.preventDefault(); // Empêcher le comportement par défaut
        if (!isLoading && filteredFactures.length > 0 && !isExporting) {
          handleExportExcel();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [user, isLoading, filteredFactures.length, isExporting]);

  // Callback pour rafraîchir la page après paiement
  const handlePaymentSuccess = (updatedFacture: Invoice, invoiceNumber: string) => {
    setOpenPaymentRow(null);
    setInlinePaymentRow(null);
    setInlinePaymentAmount("");
    setTimeout(() => setSuccessRow(null), 2000);
    if (onPaymentSuccess) {
      onPaymentSuccess(updatedFacture, invoiceNumber);
    } else {
      router.refresh();
    }
  };

  // Fonction pour nettoyer le montant (enlever les espaces et caractères non numériques)
  const cleanAmount = (amount: string): number => {
    // Enlever tous les caractères non numériques sauf le point et la virgule
    const cleaned = amount.replace(/[^\d.,]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  // Fonction pour formater le montant pour l'affichage (sans XOF)
  const formatAmountForDisplay = (amount: string): string => {
    const numericAmount = cleanAmount(amount);
    if (numericAmount === 0) return '';
    // Formater manuellement avec espaces pour les milliers
    return numericAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // Fonction pour gérer le paiement inline
  const handleInlinePayment = async (facture: Invoice) => {
    const numericAmount = cleanAmount(inlinePaymentAmount);
    if (!numericAmount || numericAmount <= 0) {
      toast({
        title: "Montant invalide",
        description: "Veuillez saisir un montant valide.",
        variant: "destructive",
      });
      return;
    }

    setIsPaying(true);
    try {
      const paymentData = {
        montant: numericAmount,
        modePaiement: PaymentMethod.ESPECE,
        datePaiement: new Date().toISOString(),
        commentaire: "Paiement rapide via input inline"
      };

      const result = await addPayment(facture.invoiceNumber, paymentData);
      
      toast({
        title: "Paiement ajouté",
        description: `Paiement de ${formatMontant(numericAmount)} ajouté avec succès.`,
      });
      setSuccessRow(facture.invoiceNumber);
      handlePaymentSuccess(facture, facture.invoiceNumber);
    } catch (error) {
      console.error('Erreur lors du paiement:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors du paiement.",
        variant: "destructive",
      });
    } finally {
      setIsPaying(false);
    }
  };

  // Ajoute une fonction pour la couleur de fond du rond d'âge
  const calculateInvoiceAge = (facture: Invoice): number | null => {
    if ([InvoiceStatus.RETOUR, InvoiceStatus.REGULE, InvoiceStatus.ANNULEE].includes(facture.status) ||
        facture.statusPayment?.toLowerCase() === 'payé') {
      return null;
    }
    if (facture.deliveredSince !== null && facture.deliveredSince !== undefined) {
      return facture.deliveredSince;
    }
    return null;
  };

  const getAgeBgColor = (age: number) => {
    if (age <= 2) return "bg-green-100 text-green-800";
    if (age <= 7) return "bg-amber-100 text-amber-800";
    if (age <= 15) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  // Fonctions pour gérer le dialog GestionFacture
  const handleOpenGestionFacture = async (factureNumber: string) => {
    try {
      setIsCheckingInvoiceStatus(true);
      
      // Récupérer les détails de la facture pour vérifier son état
      const response = await getInvoiceByNumber(factureNumber);
      
      if (!response || !response.invoice) {
        toast({
          title: "Erreur",
          description: "Cette facture n'existe pas",
          variant: "destructive",
        });
        return;
      }

      const invoice = response.invoice;
      
      // Vérifier si la facture est "non réceptionnée"
      if (invoice.status === InvoiceStatus.NON_RECEPTIONNEE) {
        // Ouvrir le dialog de confirmation
        setSelectedFactureForConfirmation(invoice);
        setIsConfirmationDialogOpen(true);
      } else {
        // Ouvrir le dialog de gestion normale
        setSelectedFactureNumber(factureNumber);
        setIsGestionFactureOpen(true);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la facture:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails de la facture",
        variant: "destructive",
      });
    } finally {
      setIsCheckingInvoiceStatus(false);
    }
  };

  const handleCloseGestionFacture = () => {
    setIsGestionFactureOpen(false);
    setSelectedFactureNumber("");
  };

  const handleGestionFactureSave = (produits: Array<{ reference: string, quantiteLivree: number }>) => {
    // Rafraîchir la page après sauvegarde
    router.refresh();
  };

  const handleGestionFactureReset = () => {
    // Rafraîchir la page après reset
    router.refresh();
  };

  // Fonctions pour gérer le dialog de confirmation
  const handleCloseConfirmationDialog = () => {
    setIsConfirmationDialogOpen(false);
    setSelectedFactureForConfirmation(null);
  };

  const handleConfirmInvoice = async () => {
    // Logique de confirmation de la facture
    // Après confirmation, ouvrir le dialog de gestion
    if (selectedFactureForConfirmation) {
      setSelectedFactureNumber(selectedFactureForConfirmation.invoiceNumber);
      setIsGestionFactureOpen(true);
    }
    handleCloseConfirmationDialog();
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
          defaultToToday={!disableDefaultDate}
        />
      </div>
      <div className="rounded-lg border border-gray-300">
        <details className="border-b md:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-sm font-semibold text-slate-900">
            <span>Résumé factures</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{filteredFactures.length} facture(s)</span>
          </summary>
          {statistics && (
            <div className="flex flex-wrap gap-1 px-3 pb-3">
              <div className="min-w-[60px] rounded-md border border-primary-200 bg-gradient-to-r from-primary-50 to-primary-100 px-2 py-1 shadow-sm">
                <div className="text-center">
                  <span className="block text-xs font-medium uppercase tracking-wide text-primary-600">Total</span>
                  <span className="text-sm font-bold text-primary-900">{statistics.total.count}</span>
                </div>
              </div>
              {Object.entries(statistics.byStatus)
                .filter(([status]) => canViewPaymentInfo || !isPaymentStatistic(status))
                .map(([status, stats]) => (
                <div key={status} className={`min-w-[60px] rounded-md border px-2 py-1 shadow-sm ${getStatisticsColor(status)} ${stats.count === 0 ? 'opacity-60' : ''}`}>
                  <div className="text-center">
                    <span className="block truncate text-xs font-medium uppercase tracking-wide opacity-80">
                      {status.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-bold">{stats.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </details>

        <div className="hidden p-2 md:block sm:p-3">
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
                  {Object.entries(statistics.byStatus)
                    .filter(([status]) => canViewPaymentInfo || !isPaymentStatistic(status))
                    .map(([status, stats], index) => (
                    <div key={status} className={`border px-2 py-1 rounded-md shadow-sm ${getStatisticsColor(status)} ${stats.count === 0 ? 'opacity-60' : ''} min-w-[60px] ${index > 3 ? 'hidden sm:block' : ''}`}>
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


          </div>
        </div>
        <div>
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
            <>
            <div className="space-y-2 p-2 md:hidden">
              {sortedFactures.map((facture) => {
                const detailHref = user && user.role !== Role.ADMIN
                  ? `/factures/${facture.invoiceNumber}`
                  : `/dashboard/invoices/${facture.invoiceNumber}`;
                return (
                  <button
                    key={facture.id}
                    type="button"
                    onClick={() => router.push(detailHref)}
                    className="w-full rounded-xl border bg-white p-3 text-left shadow-sm transition hover:border-primary/30 hover:bg-primary-50/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">{facture.customer?.name || "Client"}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">{facture.invoiceNumber}</p>
                      </div>
                      <Badge className={getStatusColor(facture.status)}>
                        {facture.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Facture : {formatDate(facture.date)}</span>
                      {facture.lastValidatedBl?.createdAt ? (
                        <span>Livrée : {formatDate(facture.lastValidatedBl.createdAt)}</span>
                      ) : facture.deliveredAt ? (
                        <span>Livrée : {formatDate(facture.deliveredAt.toString())}</span>
                      ) : null}
                    </div>
                    {canViewPaymentInfo && (
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        {facture.statusPayment && (
                          <Badge className={getStatusColor(facture.statusPayment)}>
                            {facture.statusPayment.replace("_", " ").toUpperCase()}
                          </Badge>
                        )}
                        <span className="text-sm font-semibold text-slate-900">
                          {formatMontant(facture.remainingAmount || 0)}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="hidden max-h-[600px] overflow-auto md:block">
            <Table className="border-collapse">
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow className="bg-primary-50/50 border-b border-gray-300">
                  <TableHead className="w-[50px] border-r border-gray-300">
                  </TableHead>
                  <TableHead className="font-semibold text-primary-900 border-r border-gray-300">Numéro facture</TableHead>
                  <TableHead className="font-semibold text-primary-900 border-r border-gray-300">Numéro compte</TableHead>
                  <TableHead className="font-semibold text-primary-900 border-r border-gray-300">
                    <div className="flex items-center gap-1">
                      Date facture
                      <Button
                        variant="ghost" 
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-transparent"
                        onClick={() => handleSort("invoiceDate")}
                        title="Trier par date de facture"
                      >
                        {sortField === "invoiceDate" ? (sortOrder === "asc" ? "▲" : sortOrder === "desc" ? "▼" : "⇅") : "⇅"}
                      </Button>
                    </div>
                  </TableHead>
                    <TableHead className="font-semibold text-primary-900 border-r border-gray-300">Client</TableHead>
                                      <TableHead className="font-semibold text-primary-900 border-r border-gray-300">
                    <div className="flex items-center gap-1">
                      Date de livraison
                      <Button
                        variant="ghost" 
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-transparent"
                        onClick={() => handleSort("deliveryDate")}
                        title="Trier par date de livraison"
                      >
                        {sortField === "deliveryDate" ? (sortOrder === "asc" ? "▲" : sortOrder === "desc" ? "▼" : "⇅") : "⇅"}
                      </Button>
                    </div>
                  </TableHead>
                  {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
                      <TableHead className="font-semibold text-primary-900 border-r border-gray-300">
                      <div className="flex items-center gap-1">
                        Âge
                        <Button
                          variant="ghost" 
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-transparent"
                          onClick={() => handleSort("age")}
                          title="Trier par âge"
                        >
                          {sortField === "age" ? (sortOrder === "asc" ? "▲" : sortOrder === "desc" ? "▼" : "⇅") : "⇅"}
                        </Button>
                      </div>
                    </TableHead>
                  )}
                    <TableHead className="font-semibold text-primary-900 border-r border-gray-300">État livraison</TableHead>
                                      {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && <TableHead className="font-semibold text-primary-900 border-r border-gray-300">État paiement</TableHead>}
                  {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
                      <TableHead className="font-semibold text-primary-900 border-r border-gray-300">
                      <div className="flex items-center gap-1">
                        Restant à payer
                        <Button
                          variant="ghost" 
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-transparent"
                          onClick={() => handleSort("remainingAmount")}
                          title="Trier par montant restant"
                        >
                          {sortField === "remainingAmount" ? (sortOrder === "asc" ? "▲" : sortOrder === "desc" ? "▼" : "⇅") : "⇅"}
                        </Button>
                      </div>
                    </TableHead>
                  )}
                  {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
                      <TableHead className="font-semibold text-primary-900 border-r border-gray-300">Action</TableHead>
                  )}
                  {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && (
                    <TableHead className="font-semibold text-primary-900">Détail</TableHead>
                  )}
                  {user && user.role === Role.CHEF_DEPOT && (
                    <TableHead className="font-semibold text-primary-900">Action</TableHead>
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
                        ? "z-10 ring-2 ring-primary-400 shadow-xl bg-white border-b border-gray-300"
                        : openPaymentRow
                          ? "opacity-50 pointer-events-none blur-[1.5px] select-none border-b border-gray-300"
                          : "hover:bg-primary-50/30 transition-colors duration-200 group border-b border-gray-300"
                    }
                    style={{ transition: 'all 0.2s' }}
                  >
                    <TableCell className="border-r border-gray-300">
                    </TableCell>
                    <TableCell className="font-medium border-r border-gray-300">
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
                    <TableCell className="border-r border-gray-300">
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
                    <TableCell className="border-r border-gray-300">{formatDate(facture.date)}</TableCell>
                    <TableCell className="border-r border-gray-300">{facture.customer?.name}</TableCell>
                    <TableCell className="border-r border-gray-300">
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
                      <TableCell className="border-r border-gray-300">
                        {(() => {
                          if ([InvoiceStatus.RETOUR, InvoiceStatus.REGULE, InvoiceStatus.ANNULEE].includes(facture.status) ||
                              facture.statusPayment?.toLowerCase() === 'payé') {
                            return <span className="text-gray-400 italic">-</span>;
                          }
                          const age = calculateInvoiceAge(facture);
                          if (age === null) {
                            return <span className="text-gray-400 italic">-</span>;
                          }
                          return (
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm ${getAgeBgColor(age)}`}>
                              {age}
                            </span>
                          );
                        })()}
                      </TableCell>
                    )}
                    <TableCell className="border-r border-gray-300">
                      <Badge className={getStatusColor(facture.status)}>
                        {facture.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && <TableCell className="border-r border-gray-300">
                      {facture.status !== InvoiceStatus.RETOUR && facture.status !== InvoiceStatus.ANNULEE ? <Badge className={getStatusColor(facture.statusPayment || "non_paye")}>
                        {(facture.statusPayment || "non_paye").replace("_", " ").toUpperCase()}
                      </Badge> : "-"}
                    </TableCell>}
                    {user && (user.role === Role.RECOUVREMENT || user.role === Role.ADMIN) && <TableCell className="border-r border-gray-300">
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
                      <TableCell className="border-r border-gray-300">
                        {!isPaymentOpen ? (
                          ![InvoiceStatus.RETOUR, InvoiceStatus.REGULE, InvoiceStatus.ANNULEE].includes(facture.status) ? (
                            inlinePaymentRow === facture.invoiceNumber ? (
                                  <div className="flex items-center gap-2" ref={inlineMontantInputRef}>
                                    <input
                                      type="text"
                                      value={inlinePaymentAmount}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        // Formater en temps réel pendant la saisie
                                        const formatted = formatAmountForDisplay(value);
                                        setInlinePaymentAmount(formatted);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleInlinePayment(facture);
                                        } else if (e.key === 'Escape') {
                                          setInlinePaymentRow(null);
                                          setInlinePaymentAmount("");
                                        }
                                      }}
                                      className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                      placeholder="Montant"
                                      disabled={isPaying}
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => handleInlinePayment(facture)}
                                      disabled={isPaying}
                                    >
                                      {isPaying ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Check className="w-3 h-3" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                                      onClick={() => {
                                        setInlinePaymentRow(null);
                                        setInlinePaymentAmount("");
                                      }}
                                      disabled={isPaying}
                                    >
                                      <XCircle className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="flex items-center gap-1" 
                                    onClick={e => {
                                      e.stopPropagation(); 
                                      setInlinePaymentRow(facture.invoiceNumber);
                                    }}
                                  >
                                    <PlusCircle className="w-4 h-4 mr-1 text-primary-600" /> Ajouter paiement
                                  </Button>
                                )
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
                        {user && user.role === Role.CHEF_DEPOT && (
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-1 text-green-700 border-green-300 hover:bg-green-50"
                              onClick={e => {
                                e.stopPropagation();
                                handleOpenGestionFacture(facture.invoiceNumber);
                              }}
                              disabled={isCheckingInvoiceStatus}
                              title="Gérer la livraison de la facture"
                            >
                              {isCheckingInvoiceStatus ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Truck className="w-4 h-4" />
                              )}
                              {isCheckingInvoiceStatus ? "Vérification..." : "Gérer"}
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
            </div>
            </>
          )}
        </div>
      </div>

      {/* Dialog GestionFacture pour les chefs de dépôt */}
      {user && user.role === Role.CHEF_DEPOT && (
        <GestionFacture
          isOpen={isGestionFactureOpen}
          onClose={handleCloseGestionFacture}
          numeroFacture={selectedFactureNumber}
          onSave={handleGestionFactureSave}
          reSetState={handleGestionFactureReset}
        />
      )}

      {/* Dialog de confirmation de facture pour les chefs de dépôt */}
      {user && user.role === Role.CHEF_DEPOT && (
        <InvoiceConfirmationDialog
          isOpen={isConfirmationDialogOpen}
          onClose={handleCloseConfirmationDialog}
          onConfirm={handleConfirmInvoice}
          invoiceData={selectedFactureForConfirmation}
          loading={false}
        />
      )}
    </>
  );
}