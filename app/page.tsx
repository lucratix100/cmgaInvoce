"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { Separator } from "@radix-ui/react-select"
import { useState } from "react"
import { useRouter } from "next/navigation"
import login from "@/actions/login"

export default function LoginPage() {
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      const result = await login({ phone, password })

      if (result && result.success) {
        router.push("/dashboard")
      } else {
        setError(result?.error || "Une erreur est survenue lors de la connexion")
      }
    } catch (err: any) {
      setError(err?.error || "Une erreur est survenue lors de la connexion")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <Image src="/logo.png" alt="Logo" width={150} height={150} className="mx-auto" />
            <Separator />
            <CardDescription className="text-center">
              Connectez-vous à votre compte pour gérer vos factures
            </CardDescription>
            {error && (
              <p className="text-red-500 text-sm text-center mt-2">{error}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Téléphone
              </label>
              <Input
                id="phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Votre numéro de téléphone"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Mot de passe
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button className="w-full" type="submit">
              Se connecter
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}