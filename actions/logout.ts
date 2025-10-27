"use server";

import axios from "axios";
import { cookies } from "next/headers";

export default async function logout() {
  try {
    const cookieStore = await cookies();
    const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}")?.token;

    if (!token) {
      return { error: "Déjà déconnecté" };
    }

    try {
      await axios.post(`${process.env.API_URL}logout`, null, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      cookieStore.delete("accessToken");
      cookieStore.delete("user");
    } catch (apiError) {
      console.error("Erreur API:", apiError);
    }

    // Toujours supprimer les cookies même si l'API échoue
    cookieStore.delete("accessToken");
    cookieStore.delete("user");

    return { success: "Déconnexion réussie" };
  } catch (error) {
    console.error("Erreur de déconnexion:", error);
    return { error: "Erreur lors de la déconnexion" };
  }
}