export enum Role {
  ADMIN = 'ADMIN',
  MAGASINIER = 'MAGASINIER',
  CHEF_DEPOT = 'CHEF DEPOT',
  RECOUVREMENT = 'RECOUVREMENT',
  CONTROLEUR = 'CONTROLEUR',
}

export enum InvoiceStatus {
  EN_ATTENTE = 'en attente de livraison',
  EN_COURS = 'en cours de livraison',
  LIVREE = 'livrée',
  NON_RECEPTIONNE = 'non réceptionnée',
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