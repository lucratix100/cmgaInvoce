"use server";

import { LoginSchema } from "@/schemas";
import axios from "axios";
import { z } from "zod";
import { setAuthCookies } from "@/lib/set-auth-cookies";

export default async function login(values: z.infer<typeof LoginSchema>) {
  const validatedFiels = LoginSchema.safeParse(values);
  const { success } = validatedFiels;

  if (!success) {
    return { error: "Email ou mot de passe incorrect!" };
  }

  const { email, password } = validatedFiels.data;

  try {
    const auth = await axios.post(`${process.env.API_URL}login`, {
      email,
      password,
    });

    const { accessToken, user } = auth.data;

    if (accessToken) {
      const redirectTo = await setAuthCookies(accessToken, user);

      return {
        success: "Authentication successful",
        user,
        redirectTo,
      };
    }

    return { error: "Erreur d'authentification" };
  } catch (error: any) {
    console.error("Erreur de connexion:", error);
    const message =
      error?.response?.data?.message || "Email ou mot de passe incorrect!";
    return { error: message };
  }
}
