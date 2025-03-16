"use server";

import axios from "axios";
import { cookies } from "next/headers";

export default async function logout() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return { error: "Déjà déconnecté" };
    }

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}logout`, null, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (apiError) {
      console.error("Erreur API:", apiError);
    }

    // Toujours supprimer les cookies même si l'API échoue
    cookieStore.set("token", "", { maxAge: 0, path: '/' });
    cookieStore.set("userId", "", { maxAge: 0, path: '/' });
    cookieStore.set("userRole", "", { maxAge: 0, path: '/' });

    return { success: "Déconnexion réussie" };
  } catch (error) {
    console.error("Erreur de déconnexion:", error);
    return { error: "Erreur lors de la déconnexion" };
  }
}