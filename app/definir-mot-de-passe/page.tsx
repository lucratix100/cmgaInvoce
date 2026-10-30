"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { resetPassword } from "@/actions/password-reset"

function SetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!token) {
      setError("Lien invalide : token manquant")
      return
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return
    }

    setIsLoading(true)
    try {
      const result = await resetPassword({ token, password, confirmPassword })
      if (result.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }
      router.push(result.redirectTo || "/dashboard")
    } catch {
      setError("Une erreur est survenue")
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <Card className="w-full max-w-md border-white/60 bg-white/90 shadow-xl">
        <CardHeader>
          <CardTitle>Lien invalide</CardTitle>
          <CardDescription>Ce lien de définition de mot de passe est invalide ou incomplet.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/mot-de-passe-oublie" className="text-sm text-primary-600 hover:underline">
            Demander un nouveau lien
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md border-white/60 bg-white/90 shadow-xl backdrop-blur-sm">
      <form onSubmit={handleSubmit}>
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl font-bold text-primary-700">Activer votre compte</CardTitle>
          <CardDescription>
            Définissez obligatoirement un mot de passe pour activer votre compte. Vous serez ensuite connecté automatiquement.
          </CardDescription>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-center text-sm text-red-600">{error}</p>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Lock className="h-4 w-4" />
              Nouveau mot de passe
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                className="h-11 rounded-xl pr-12"
                disabled={isLoading}
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Masquer" : "Afficher"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Lock className="h-4 w-4" />
              Confirmer le mot de passe
            </label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmez le mot de passe"
              className="h-11 rounded-xl"
              disabled={isLoading}
              minLength={8}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="h-11 w-full rounded-xl" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Validation...
              </span>
            ) : (
              "Enregistrer et se connecter"
            )}
          </Button>
          <Link href="/" className="flex items-center justify-center gap-1 text-sm text-primary-600 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Retour à la connexion
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function SetPasswordPage() {
  return (
    <div className="fixed inset-0 flex h-[100dvh] items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-primary-700">
            <Loader2 className="h-5 w-5 animate-spin" />
            Chargement...
          </div>
        }
      >
        <SetPasswordForm />
      </Suspense>
    </div>
  )
}
