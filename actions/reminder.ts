"use server"
import { InvoiceReminder } from "@/lib/types";
import axios from "axios";
import { cookies } from "next/headers";


export async function createReminder(data: {
  invoiceId: number;
  remindAt: Date;
  comment: string;

}) {

  try {
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

    if (!token) {
      throw new Error("Vous devez être connecté pour créer une notification");
    }
    // Formatage des données pour l'API
    const formattedData = {
      ...data,
      remindAt: data.remindAt.toISOString(),
    };
    const response = await axios.post(
      `${process.env.API_URL}invoice-reminders`,
      formattedData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || "Erreur lors de la création du rappel";
      console.error("Erreur API:", error.response?.data);
      throw new Error(message);
    }
    throw error;
  }
}

export async function getRemindersByInvoice(invoiceNumber: string): Promise<InvoiceReminder[]> {
  try {
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

    if (!token) {
      throw new Error("Non authentifié")
    }
    const response = await axios.get(`${process.env.API_URL}invoice-reminders/invoice/${invoiceNumber}`, {
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
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

    if (!token) {
      throw new Error("Non authentifié")
    }
    const response = await axios.delete(`${process.env.API_URL}invoice-reminders/${id}`, {
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
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

    if (!token) {
      throw new Error("Non authentifié")
    }
    const response = await axios.patch(
      `${process.env.API_URL}invoice-reminders/${id}/read`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("API Error:", error.response?.data);
      throw new Error(error.response?.data?.message || "Erreur lors de la mise à jour du statut du rappel");
    }
    throw error;
  }
}

export async function getUserReminders(userId: number): Promise<InvoiceReminder[]> {
  try {
    const cookieStore = await cookies()
    const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token

    if (!token) {
      throw new Error("Non authentifié")
    }

    const response = await axios.get(`${process.env.API_URL}user-invoice-reminders`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || "Erreur lors de la récupération des notifications");
    }
    throw error;
  }
}
