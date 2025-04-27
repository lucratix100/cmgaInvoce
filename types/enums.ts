export enum InvoiceStatus {
    EN_ATTENTE = 'en attente de livraison',
    EN_COURS = 'en cours de livraison',
    LIVREE = 'livrée'
} 

export enum InvoicePaymentStatus {
    PAYE = 'payé',
    NON_PAYE = 'non payé',
    PARTIELLEMENT_PAYE = 'paiement partiel'
}

export enum PaymentMethod {
    ESPECE = 'Espece',
    CHEQUE = 'Cheque',
    VIREMENT = 'Virement',
    ORANGE_MONEY = 'Orange Money',
    WAVE = 'Wave',
    AUTRE = 'Autre',
}