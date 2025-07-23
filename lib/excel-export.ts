import * as XLSX from 'xlsx';
import { Invoice } from '@/lib/types';
import { getMultipleInvoiceDetails } from '../actions/invoice-details';

export interface ExcelExportData {
  factures: Invoice[];
  user: any;
}

// Fonction pour obtenir la couleur selon le statut
const getStatusColor = (status: string, isPayment: boolean = false) => {
  const upperStatus = status.toUpperCase();
  
  if (isPayment) {
    // Couleurs pour les statuts de paiement
    switch (upperStatus) {
      case 'PAYÉ':
        return { bg: '00FF00', fg: '000000' }; // Vert, texte noir
      case 'NON PAYÉ':
        return { bg: 'FF0000', fg: 'FFFFFF' }; // Rouge, texte blanc
      case 'PAIEMENT PARTIEL':
        return { bg: 'FFFF00', fg: '000000' }; // Jaune, texte noir
      default:
        return { bg: 'CCCCCC', fg: '000000' }; // Gris, texte noir
    }
  } else {
    // Couleurs pour les statuts de livraison
    switch (upperStatus) {
      case 'LIVRÉE':
        return { bg: '00FF00', fg: '000000' }; // Vert, texte noir
      case 'EN ATTENTE DE LIVRAISON':
        return { bg: 'FFFF00', fg: '000000' }; // Jaune, texte noir
      case 'EN COURS DE LIVRAISON':
        return { bg: '00FFFF', fg: '000000' }; // Cyan, texte noir
      case 'LIVRAISON PARTIELLE':
        return { bg: '90EE90', fg: '000000' }; // Vert clair, texte noir
      case 'NON RÉCEPTIONNÉE':
        return { bg: 'FF0000', fg: 'FFFFFF' }; // Rouge, texte blanc
      default:
        return { bg: 'CCCCCC', fg: '000000' }; // Gris, texte noir
    }
  }
};

// Fonction pour formater les informations des BL
const formatBlInfo = (bls: any[]) => {
  if (!bls || bls.length === 0) return 'Aucun BL';
  
  const validBls = bls.filter(bl => bl.status === 'validée');
  const pendingBls = bls.filter(bl => bl.status === 'en attente de confirmation');
  
  let info = '';
  
  if (validBls.length > 0) {
    info += `${validBls.length} BL validé(s)`;
    if (validBls.length > 1) {
      const totalAmount = validBls.reduce((sum, bl) => sum + (Number(bl.total) || 0), 0);
      if (totalAmount > 0) {
        info += ` (Total: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(totalAmount)})`;
      }
    }
  }
  
  if (pendingBls.length > 0) {
    if (info) info += ' | ';
    info += `${pendingBls.length} BL en attente`;
  }
  
  return info || 'Aucun BL';
};

// Fonction pour formater les informations des paiements
const formatPaymentInfo = (payments: any[]) => {
  if (!payments || payments.length === 0) return 'Aucun paiement';
  
  // Trier les paiements par date (du plus récent au plus ancien)
  const sortedPayments = [...payments].sort((a, b) => 
    new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
  );
  
  const totalPaid = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  
  let info = `${payments.length} paiement(s) - Total: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(totalPaid)}`;
  
  // Ajouter les détails de chaque paiement
  if (payments.length > 0) {
    info += '\n';
    sortedPayments.forEach((payment, index) => {
      const date = new Date(payment.paymentDate).toLocaleDateString('fr-FR');
      const amount = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(payment.amount);
      const method = payment.paymentMethod || 'N/A';
      info += `${index + 1}. ${date} - ${amount} (${method})`;
      if (payment.comment) {
        info += ` - ${payment.comment}`;
      }
      if (index < sortedPayments.length - 1) {
        info += '\n';
      }
    });
  }
  
  return info;
};

// Fonction pour calculer et formater le surplus
const formatSurplusInfo = (totalTtc: any, remainingAmount: any) => {
  const total = Number(totalTtc);
  const remaining = Number(remainingAmount);
  
  if (isNaN(total) || total <= 0) return '';
  if (isNaN(remaining) || remaining >= 0) return '';
  
  // Si remainingAmount est négatif, c'est un surplus
  const surplus = Math.abs(remaining);
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(surplus);
};

// Fonction pour formater les informations du chauffeur
const formatDriverInfo = (bls: any[]) => {
  if (!bls || bls.length === 0) return '';
  
  const validBls = bls.filter(bl => bl.status === 'validée' && bl.driver);
  if (validBls.length === 0) return '';
  
  const lastBl = validBls[validBls.length - 1]; // Le plus récent
  const driver = lastBl.driver;
  
  if (!driver || !driver.firstname || !driver.lastname) return '';
  
  const driverName = `${driver.firstname} ${driver.lastname}`;
  const driverPhone = driver.phone ? ` (${driver.phone})` : '';
  
  return driverName + driverPhone;
};

// Fonction pour formater le montant TTC
const formatTotalTTC = (totalTtc: any) => {
  const amount = Number(totalTtc);
  if (isNaN(amount) || amount <= 0) return '';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
};

// Fonction pour formater la date de livraison
const formatDeliveryDate = (deliveredAt: any, bls: any[], status: string) => {
  // Si la facture est complètement livrée, utiliser deliveredAt
  if (status === 'livrée' && deliveredAt) {
    try {
      return new Date(deliveredAt).toLocaleDateString('fr-FR');
    } catch (error) {
      return '';
    }
  }
  
  // Si la facture n'est pas complètement livrée mais qu'il y a des BL livrés
  if (bls && bls.length > 0) {
    const validBls = bls.filter(bl => bl.status === 'validée');
    if (validBls.length > 0) {
      // Trier les BL par date de création (du plus récent au plus ancien)
      const sortedBls = validBls.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      const lastBl = sortedBls[0]; // Le plus récent
      if (lastBl && lastBl.createdAt) {
        try {
          return new Date(lastBl.createdAt).toLocaleDateString('fr-FR') + ' (BL partiel)';
        } catch (error) {
          return '';
        }
      }
    }
  }
  
  return '';
};

// Fonction pour calculer la progression de paiement
// const calculatePaymentProgress = (totalTtc: any, remainingAmount: any) => {
//   const total = Number(totalTtc);
//   const remaining = Number(remainingAmount);
  
//   if (isNaN(total) || total <= 0) return '';
//   if (isNaN(remaining) || remaining < 0) return '';
  
//   const paid = total - remaining;
//   const progress = Math.round((paid / total) * 100);
  
//   return `${progress}%`;
// };

// Fonction pour vérifier si la facture a des paiements en mode OD
// const hasODPayment = (payments: any[]) => {
//   if (!payments || payments.length === 0) return false;
//   return payments.some(payment => payment.paymentMethod === 'OD');
// };

// Fonction pour formater les informations sur les paiements OD
const formatODPaymentInfo = (payments: any[]) => {
  if (!payments || payments.length === 0) return '';
  
  const odPayments = payments.filter(payment => payment.paymentMethod === 'OD');
  if (odPayments.length === 0) return '';
  
  const totalOD = odPayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  
  let info = `${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(totalOD)}`;
  
  return info;
};

export const exportToExcel = async (data: ExcelExportData) => {
  const { factures, user } = data;
  
  // Récupérer les détails pour toutes les factures
  const invoiceNumbers = factures.map(f => f.invoiceNumber);
  const invoiceDetails = await getMultipleInvoiceDetails(invoiceNumbers);
  
  // Préparer les données pour l'export
  const exportData = factures.map((facture) => {
    const details = invoiceDetails[facture.invoiceNumber] || { bls: [], payments: [] };
    
    const baseData = {
      'Numéro facture': facture.invoiceNumber,
      'Numéro compte': facture.accountNumber,
      'Date facture': new Date(facture.date).toLocaleDateString('fr-FR'),
      'Client': facture.customer?.name || 'Non renseigné',
      'Téléphone client': facture.customer?.phone || 'Non renseigné',
      'Montant total TTC': formatTotalTTC(facture.totalTtc),
      'État livraison': facture.status.replace("_", " ").toUpperCase(),
      'Date de livraison': formatDeliveryDate(facture.deliveredAt, details.bls, facture.status),
      'Informations BL': formatBlInfo(details.bls),
      'Chauffeur': formatDriverInfo(details.bls) || 'Pas encore lié à un BL',
      'Escompte': formatODPaymentInfo(details.payments),
      
    };

    // Ajouter les colonnes spécifiques au recouvrement si l'utilisateur a les droits
    if (user.role === 'RECOUVREMENT' || user.role === 'ADMIN') {
      let montantRestantStr = '';
      if ((facture.statusPayment || '').toUpperCase() === 'PAYÉ') {
        montantRestantStr = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(0);
      } else {
        montantRestantStr = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(Math.max(0, Number(facture.remainingAmount) || 0));
      }
      return {
        ...baseData,
        'État paiement': (facture.statusPayment || "non_paye").replace("_", " ").toUpperCase(),
        'Reste à payer': montantRestantStr,
        'Surplus': formatSurplusInfo(facture.totalTtc, facture.remainingAmount),
        'Informations paiements': formatPaymentInfo(details.payments),
        // 'Progression paiement': calculatePaymentProgress(facture.totalTtc, facture.remainingAmount),
      };
    }

    return baseData;
  });

  // Créer un nouveau classeur
  const workbook = XLSX.utils.book_new();
  
  // Créer une feuille de calcul avec les données
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Ajuster la largeur des colonnes
  const columnWidths = [
    { wch: 15 }, // Numéro facture
    { wch: 15 }, // Numéro compte
    { wch: 12 }, // Date facture
    { wch: 30 }, // Client
    { wch: 15 }, // Téléphone client
    { wch: 18 }, // Montant total TTC
    { wch: 20 }, // État livraison
    { wch: 15 }, // Date de livraison
    { wch: 35 }, // Informations BL
    { wch: 25 }, // Chauffeur
    { wch: 15 }, // Escompte
  ];

  // Ajouter les largeurs pour les colonnes spécifiques au recouvrement
  if (user.role === 'RECOUVREMENT' || user.role === 'ADMIN') {
    columnWidths.push(
      { wch: 15 }, // État paiement
      { wch: 20 }, // Reste à payer
      { wch: 15 }, // Surplus
      { wch: 60 }, // Informations paiements (plus large pour tous les paiements)
      { wch: 15 }  // Progression paiement
    );
  }

  worksheet['!cols'] = columnWidths;

  // Appliquer les couleurs aux cellules des statuts
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Obtenir les en-têtes de colonnes
  const headers = Object.keys(exportData[0] || {});
  
  // Trouver les indices des colonnes par nom
  const livraisonColIndex = headers.indexOf('État livraison');
  const paiementColIndex = headers.indexOf('État paiement');
  
  // Colonne État livraison
  if (livraisonColIndex !== -1) {
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: livraisonColIndex });
      const cell = worksheet[cellAddress];
      if (cell && cell.v) {
        const status = cell.v.toString();
        const colors = getStatusColor(status, false);
        
        // Debug: afficher les informations de couleur
        console.log(`Colonne livraison - Cellule ${cellAddress}: ${status} -> bg: ${colors.bg}, fg: ${colors.fg}`);
        
        cell.s = {
          fill: { 
            fgColor: { rgb: colors.bg }
          },
          font: { 
            color: { rgb: colors.fg }, 
            bold: true 
          }
        };
      }
    }
  }

  // Colonne État paiement - seulement pour recouvrement
  if ((user.role === 'RECOUVREMENT' || user.role === 'ADMIN') && paiementColIndex !== -1) {
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: paiementColIndex });
      const cell = worksheet[cellAddress];
      if (cell && cell.v) {
        const status = cell.v.toString();
        const colors = getStatusColor(status, true);
        
        // Debug: afficher les informations de couleur
        console.log(`Colonne paiement - Cellule ${cellAddress}: ${status} -> bg: ${colors.bg}, fg: ${colors.fg}`);
        
        cell.s = {
          fill: { 
            fgColor: { rgb: colors.bg }
          },
          font: { 
            color: { rgb: colors.fg }, 
            bold: true 
          }
        };
      }
    }
  }

  // Ajouter la feuille au classeur
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Recouvrement');

  // Générer le nom du fichier avec la date
  const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
  const fileName = `recouvrement_detaille_${date}.xlsx`;

  // Télécharger le fichier
  XLSX.writeFile(workbook, fileName);
};

export const exportFilteredToExcel = async (data: ExcelExportData, filters: {
  searchQuery: string;
  paymentStatus: string;
  deliveryStatus: string;
  selectedDepot: string;
}) => {
  const { factures, user } = data;
  const { searchQuery, paymentStatus, deliveryStatus, selectedDepot } = filters;

  // Appliquer les mêmes filtres que dans le composant
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

  // Exporter les données filtrées
  await exportToExcel({ factures: filteredFactures, user });
}; 