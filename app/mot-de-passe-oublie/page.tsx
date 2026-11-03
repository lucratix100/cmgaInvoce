"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Loader2, ArrowLeft } from "lucide-react"
import { forgotPassword } from "@/actions/password-reset"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const result = await forgotPassword({ email })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(result.success || "Email envoyé si le compte existe.")
      }
    } catch {
      setError("Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex h-[100dvh] items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4">
      <Card className="w-full max-w-md border-white/60 bg-white/90 shadow-xl backdrop-blur-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl font-bold text-primary-700">Mot de passe oublié / lien expiré</CardTitle>
            <CardDescription>
              Saisissez votre email pour recevoir un nouveau lien (réinitialisation ou activation du compte).
            </CardDescription>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-center text-sm text-red-600">{error}</p>
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-center text-sm text-green-700">{success}</p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="h-11 rounded-xl"
                disabled={isLoading}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="h-11 w-full rounded-xl" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi...
                </span>
              ) : (
                "Envoyer le lien"
              )}
            </Button>
            <Link href="/" className="flex items-center justify-center gap-1 text-sm text-primary-600 hover:underline">
              <ArrowLeft className="h-4 w-4" />
              Retour à la connexion
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
