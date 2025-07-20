export enum Role {
  ADMIN = 'ADMIN',
  MAGASINIER = 'MAGASINIER',
  CHEF_DEPOT = 'CHEF DEPOT',
  RECOUVREMENT = 'RECOUVREMENT',
  CONTROLEUR = 'CONTROLEUR',
  SUPERVISEUR_MAGASIN = 'SUPERVISEUR_MAGASIN',
}

export enum InvoiceStatus {
  NON_RECEPTIONNEE = 'non réceptionnée',
  EN_ATTENTE = 'en attente de livraison',
  EN_COURS = 'en cours de livraison',
  LIVREE = 'livrée',
  RETOUR = 'retour',
  REGULE = 'régule',
  ANNULEE = 'annulée',
  // EN_ATTENTE_PAIEMENT = 'en attente de paiement',
  // PARTIELLEMENT_LIVREE = 'partiellement livrée',
}

export enum InvoicePaymentStatus {
  NON_PAYE = 'non payé',
  PAIEMENT_PARTIEL = 'paiement partiel',
  PAYE = 'payé',
  // ANNULE = 'annulé',    
}

export enum PaymentMethod {
  ESPECE = 'Espece',
  CHEQUE = 'Cheque',
  VIREMENT = 'Virement',
  MOBILE_MONEY = 'Mobile Money',
  RETOUR = 'Retour',
  OD = 'OD',
}