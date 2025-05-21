import { InvoiceReminder } from "@/lib/types";
import axios from "axios";

const getToken = () => {
  if (typeof window === 'undefined') return '';
  const token = localStorage.getItem('accessToken');
  return token ? JSON.parse(token).token : '';
};

export async function createReminder(data: {
  invoiceId: string;
  remindAt: Date;
  comment: string;
  userId: string;
}) {
  try {
    const token = getToken();
    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}invoice-reminders`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Erreur lors de la création du rappel");
    }
    throw error;
  }
}

export async function getRemindersByInvoice(invoiceNumber: string): Promise<InvoiceReminder[]> {
  try {
    const token = getToken();
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}invoice-reminders/invoice/${invoiceNumber}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Erreur lors de la récupération des rappels");
    }
    throw error;
  }
}

export async function deleteReminder(id: string) {
  try {
    const token = getToken();
    const response = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}invoice-reminders/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Erreur lors de la suppression du rappel");
    }
    throw error;
  }
}

export async function markReminderAsRead(id: string) {
  try {
    const token = getToken();
    const response = await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}invoice-reminders/${id}/read`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Erreur lors de la mise à jour du statut du rappel");
    }
    throw error;
  }
}
