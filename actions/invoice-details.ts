'use server'

import axios from 'axios'
import { cookies } from 'next/headers'

export interface BlDetails {
  id: number;
  status: string;
  createdAt: string;
  total: number;
  driver?: {
    firstname: string;
    lastname: string;
    phone: string;
  };
  products: any[];
}

export interface PaymentDetails {
  id: number;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  comment: string | null;
}

export interface InvoiceDetails {
  bls: BlDetails[];
  payments: PaymentDetails[];
}

export const getInvoiceDetails = async (invoiceNumber: string): Promise<InvoiceDetails> => {
  try {
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

    // Récupérer les BL
    const blsResponse = await axios.get(`${process.env.API_URL}invoices/${invoiceNumber}/bls`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    // Récupérer les paiements
    const paymentsResponse = await axios.get(`${process.env.API_URL}payments?invoiceNumber=${invoiceNumber}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    return {
      bls: blsResponse.data || [],
      payments: paymentsResponse.data || []
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des détails de la facture:', error);
    return {
      bls: [],
      payments: []
    };
  }
};

export const getMultipleInvoiceDetails = async (invoiceNumbers: string[]): Promise<{ [key: string]: InvoiceDetails }> => {
  const details: { [key: string]: InvoiceDetails } = {};
  
  // Récupérer les détails pour chaque facture
  for (const invoiceNumber of invoiceNumbers) {
    try {
      details[invoiceNumber] = await getInvoiceDetails(invoiceNumber);
    } catch (error) {
      console.error(`Erreur pour la facture ${invoiceNumber}:`, error);
      details[invoiceNumber] = { bls: [], payments: [] };
    }
  }
  
  return details;
}; 