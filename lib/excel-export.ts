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
        return { bg: { rgb: 'C6EFCE' }, fg: { rgb: '006100' } }; // Vert clair, texte vert foncé
      case 'NON PAYÉ':
        return { bg: { rgb: 'FFC7CE' }, fg: { rgb: '9C0006' } }; // Rouge clair, texte rouge foncé
      case 'PAIEMENT PARTIEL':
        return { bg: { rgb: 'FFEB9C' }, fg: { rgb: '9C6500' } }; // Jaune clair, texte orange
      default:
        return { bg: { rgb: 'F2F2F2' }, fg: { rgb: '000000' } }; // Gris clair, texte noir
    }
  } else {
    // Couleurs pour les statuts de livraison
    switch (upperStatus) {
      case 'LIVRÉE':
        return { bg: { rgb: 'C6EFCE' }, fg: { rgb: '006100' } }; // Vert clair, texte vert foncé
      case 'EN ATTENTE DE LIVRAISON':
        return { bg: { rgb: 'FFEB9C' }, fg: { rgb: '9C6500' } }; // Jaune clair, texte orange
      case 'EN COURS DE LIVRAISON':
        return { bg: { rgb: 'DDEBF7' }, fg: { rgb: '2E5984' } }; // Bleu clair, texte bleu foncé
      case 'LIVRAISON PARTIELLE':
        return { bg: { rgb: 'E2EFDA' }, fg: { rgb: '2E7D32' } }; // Vert très clair, texte vert
      case 'NON RÉCEPTIONNÉE':
        return { bg: { rgb: 'FFC7CE' }, fg: { rgb: '9C0006' } }; // Rouge clair, texte rouge foncé
      default:
        return { bg: { rgb: 'F2F2F2' }, fg: { rgb: '000000' } }; // Gris clair, texte noir
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
  
  const totalPaid = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const lastPayment = payments[0]; // Le plus récent (trié par date décroissante)
  
  let info = `${payments.length} paiement(s) - Total: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(totalPaid)}`;
  
  if (lastPayment && lastPayment.paymentDate) {
    info += ` | Dernier: ${new Date(lastPayment.paymentDate).toLocaleDateString('fr-FR')} (${lastPayment.paymentMethod || 'N/A'})`;
  }
  
  return info;
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

// Fonction pour calculer la progression de paiement
const calculatePaymentProgress = (totalTtc: any, remainingAmount: any) => {
  const total = Number(totalTtc);
  const remaining = Number(remainingAmount);
  
  if (isNaN(total) || total <= 0) return '';
  if (isNaN(remaining) || remaining < 0) return '';
  
  const paid = total - remaining;
  const progress = Math.round((paid / total) * 100);
  
  return `${progress}%`;
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
      'Informations BL': formatBlInfo(details.bls),
      'Chauffeur': formatDriverInfo(details.bls) || 'Pas encore lié à un BL',
    };

    // Ajouter les colonnes spécifiques au recouvrement si l'utilisateur a les droits
    if (user.role === 'RECOUVREMENT' || user.role === 'ADMIN') {
      let montantRestantStr = '';
      if ((facture.statusPayment || '').toUpperCase() === 'PAYÉ') {
        montantRestantStr = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(0);
        if (Number(facture.remainingAmount) < 0) {
          montantRestantStr += ' +' + new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(Math.abs(Number(facture.remainingAmount)));
        }
      } else {
        montantRestantStr = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(Math.max(0, Number(facture.remainingAmount) || 0));
      }
      return {
        ...baseData,
        'Date échéance': new Date(facture.date).toLocaleDateString('fr-FR'),
        'État paiement': (facture.statusPayment || "non_paye").replace("_", " ").toUpperCase(),
        'Montant restant à payer': montantRestantStr,
        'Informations paiements': formatPaymentInfo(details.payments),
        'Progression paiement': calculatePaymentProgress(facture.totalTtc, facture.remainingAmount),
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
    { wch: 35 }, // Informations BL
    { wch: 25 }, // Chauffeur
  ];

  // Ajouter les largeurs pour les colonnes spécifiques au recouvrement
  if (user.role === 'RECOUVREMENT' || user.role === 'ADMIN') {
    columnWidths.push(
      { wch: 12 }, // Date échéance
      { wch: 15 }, // État paiement
      { wch: 20 }, // Montant restant
      { wch: 40 }, // Informations paiements
      { wch: 15 }  // Progression paiement
    );
  }

  worksheet['!cols'] = columnWidths;

  // Appliquer les couleurs aux cellules des statuts
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Colonne État livraison (colonne G, index 6)
  const livraisonCol = 6;
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: livraisonCol });
    const cell = worksheet[cellAddress];
    if (cell && cell.v) {
      const status = cell.v.toString();
      const colors = getStatusColor(status, false);
      cell.s = {
        fill: { fgColor: colors.bg },
        font: { color: colors.fg, bold: true }
      };
    }
  }

  // Colonne État paiement (colonne J, index 9) - seulement pour recouvrement
  if (user.role === 'RECOUVREMENT' || user.role === 'ADMIN') {
    const paiementCol = 9;
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: paiementCol });
      const cell = worksheet[cellAddress];
      if (cell && cell.v) {
        const status = cell.v.toString();
        const colors = getStatusColor(status, true);
        cell.s = {
          fill: { fgColor: colors.bg },
          font: { color: colors.fg, bold: true }
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