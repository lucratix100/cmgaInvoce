"use server"

import axios from "axios"
import { z } from "zod"
import { ForgotPasswordSchema, ResetPasswordSchema } from "@/schemas"
import { setAuthCookies } from "@/lib/set-auth-cookies"

export async function forgotPassword(values: z.infer<typeof ForgotPasswordSchema>) {
  const parsed = ForgotPasswordSchema.safeParse(values)
  if (!parsed.success) {
    return { error: "Email invalide" }
  }

  try {
    const response = await axios.post(`${process.env.API_URL}forgot-password`, {
      email: parsed.data.email,
    })
    return {
      success: response.data?.message || "Si un compte existe, un email a été envoyé.",
    }
  } catch (error) {
    console.error("Erreur forgotPassword:", error)
    return { error: "Impossible d'envoyer l'email de récupération" }
  }
}

export async function resetPassword(values: z.infer<typeof ResetPasswordSchema>) {
  const parsed = ResetPasswordSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Données invalides" }
  }

  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { error: "Les mots de passe ne correspondent pas" }
  }

  try {
    const response = await axios.post(`${process.env.API_URL}reset-password`, parsed.data)
    const { accessToken, user, message } = response.data

    if (!accessToken || !user) {
      return { error: "Réponse serveur invalide" }
    }

    const redirectTo = await setAuthCookies(accessToken, user)

    return {
      success: message || "Mot de passe défini avec succès",
      redirectTo,
      user,
    }
  } catch (error: any) {
    console.error("Erreur resetPassword:", error)
    const message =
      error?.response?.data?.message || "Lien invalide ou expiré"
    return { error: message }
  }
}
