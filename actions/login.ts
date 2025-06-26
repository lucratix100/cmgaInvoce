"use server";

import { LoginSchema } from "@/schemas";
import axios from "axios";
import { z } from "zod";
import { cookies } from "next/headers";


export default async function login(values: z.infer<typeof LoginSchema>) {
  const validatedFiels = LoginSchema.safeParse(values);
  const { success } = validatedFiels;

  if (!success) {
    return { error: "Numéro de téléphone ou mot de passe incorrect!" };
  }

  const { phone, password } = validatedFiels.data;

  // const user = await getUser();

  try {
    const auth = await axios.post(`${process.env.API_URL}login`, {
      phone,
      password,
    });

    const { accessToken, user } = auth.data;
    console.log(auth.data , "auth.data");



    if (accessToken) {
      const cookieStore = await cookies();
      cookieStore.set({
        name: "accessToken",
        value: JSON.stringify(accessToken),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24,
        path: "/"
      });

      cookieStore.set({
        name: "user",
        value: JSON.stringify(user),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24,
        path: "/"
      });

      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken.token}`;

      return {
        success: "Authentication successful",
        user,
        redirectTo: user.role === 'ADMIN' ? '/dashboard' : '/'
      };
    }

    return { error: "Erreur d'authentification" };
  } catch (error: any) {
    console.error("Erreur de connexion:", error);
    return { error: "Numéro de téléphone ou mot de passe incorrect!" };
  }
}