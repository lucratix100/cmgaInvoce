export enum Role {
  ADMIN = 'ADMIN',
  MAGASINIER = 'MAGASINIER',
  CHEF_DEPOT = 'CHEF DEPOT',
  RECOUVREMENT = 'RECOUVREMENT',
  CONTROLEUR = 'CONTROLEUR',
  SUPERVISEUR_MAGASIN = 'SUPERVISEUR_MAGASIN',
  AGENT_COMMERCIAL = 'AGENT_COMMERCIAL',
  COMMERCIAL_ADMIN = 'COMMERCIAL_ADMIN',
  ADMIN_DETAILLANT = 'ADMIN_DETAILLANT',
  COMMERCIAL_DETAILLANT = 'COMMERCIAL_DETAILLANT',
  FACTURATION = 'FACTURATION',
}

export enum CommercialClientType {
  MAGASIN = 'MAGASIN',
  INDIVIDUEL = 'INDIVIDUEL',
}

export enum CommercialPlanningDay {
  LUNDI = 'LUNDI',
  MARDI = 'MARDI',
  MERCREDI = 'MERCREDI',
  JEUDI = 'JEUDI',
  VENDREDI = 'VENDREDI',
  SAMEDI = 'SAMEDI',
  DIMANCHE = 'DIMANCHE',
}

export enum CommercialExecutionStatus {
  APPELE = 'APPELE',
  NON_REPONDU = 'NON_REPONDU',
  COMMANDE_PRISE = 'COMMANDE_PRISE',
  A_RELANCER = 'A_RELANCER',
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