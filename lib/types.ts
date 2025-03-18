export type User = {
    id: string;
    firstname: string;
    lastname: string;
    role: string;
};
export type Customer = {
    name: string;
    accountNumber: string;
    phone: string;
}
export type InvoiceProduct = {
    designation: string;
    quantite: number;
    prixUnitaire: number;
    total: number;
    reference: string;

}
export type BlProduct = {
    id?: string;
    designation: string;
    quantite: number;
    prixUnitaire: number;
    montantTotal: number;
    reference: string;
    remainingQty: number;
}

export type Invoice = {
    id: string;
    invoiceNumber: string;
    accountNumber: string;
    date: string;
    status: string;
    isCompleted: boolean;
    isCompleteDelivery: boolean;
    order: InvoiceProduct[];
    customer: Customer;
    depotId: string;
    totalTtc: number;
}
export type Bl = {
    id: string;
    invoiceId: string;
    date: string;
    status: string;
    products: BlProduct[];
    isDelivery: boolean;
    createdAt: string;
    driver: Driver;
}
export type CreateBl = {
    invoiceNumber: string
    driverId: number
    products: BlProduct[]
}

export type CreateBlProduct = {
    reference: string;
    quantite: number;
    prixUnitaire: number;
    designation: string;
    montantTotal: number;
}

export type Driver = {
    id: number;
    firstname: string;
    lastname: string;
    phone: string;
    isActive: boolean;
}