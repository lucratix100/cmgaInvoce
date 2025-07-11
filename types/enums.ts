export enum InvoiceStatus {
    NON_RECEPTIONNEE = 'non réceptionnée',
    EN_ATTENTE = 'en attente de livraison',
    EN_COURS = 'en cours de livraison',
    LIVREE = 'livrée',
    RETOUR = 'retour'
}

export enum InvoicePaymentStatus {
    NON_PAYE = 'non payé',
    PAIEMENT_PARTIEL = 'paiement partiel',
    PAYE = 'payé',

}

export enum PaymentMethod {
    ESPECE = 'Espece',
    CHEQUE = 'Cheque',
    VIREMENT = 'Virement',
    MOBILE_MONEY = 'Mobile Money',
    RETOUR = 'Retour',
    OD = 'OD',
}