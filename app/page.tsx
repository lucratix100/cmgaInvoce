"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import login from "@/actions/login"
import { Phone, Lock, Eye, EyeOff, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const previousHtmlOverflow = html.style.overflow
    const previousBodyOverflow = body.style.overflow
    const previousBodyHeight = body.style.height
    const previousBodyPosition = body.style.position
    const previousBodyWidth = body.style.width
    const previousBodyOverscroll = body.style.overscrollBehavior

    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    body.style.height = "100dvh"
    body.style.position = "fixed"
    body.style.width = "100%"
    body.style.overscrollBehavior = "none"

    return () => {
      html.style.overflow = previousHtmlOverflow
      body.style.overflow = previousBodyOverflow
      body.style.height = previousBodyHeight
      body.style.position = previousBodyPosition
      body.style.width = previousBodyWidth
      body.style.overscrollBehavior = previousBodyOverscroll
    }
  }, [])

  useEffect(() => {
    const viewport = window.visualViewport
    let resetTimer: number | undefined

    const isEditableElement = (element: Element | null) => {
      return (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement
      )
    }

    const setKeyboardOffset = (offset: number) => {
      document.documentElement.style.setProperty("--login-keyboard-offset", `${offset}px`)
    }

    const updateKeyboardOffset = () => {
      if (!viewport || !isEditableElement(document.activeElement)) {
        setKeyboardOffset(0)
        return
      }

      const keyboardHeight = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      const offset = keyboardHeight > 120 ? Math.min(Math.round(keyboardHeight * 0.45), 170) : 0
      setKeyboardOffset(offset)
    }

    const handleFocusIn = () => {
      if (resetTimer) {
        window.clearTimeout(resetTimer)
      }

      window.setTimeout(updateKeyboardOffset, 80)
      window.setTimeout(updateKeyboardOffset, 250)
    }

    const handleFocusOut = () => {
      resetTimer = window.setTimeout(() => {
        if (!isEditableElement(document.activeElement)) {
          setKeyboardOffset(0)
        }
      }, 150)
    }

    viewport?.addEventListener("resize", updateKeyboardOffset)
    viewport?.addEventListener("scroll", updateKeyboardOffset)
    window.addEventListener("orientationchange", updateKeyboardOffset)
    document.addEventListener("focusin", handleFocusIn)
    document.addEventListener("focusout", handleFocusOut)

    return () => {
      if (resetTimer) {
        window.clearTimeout(resetTimer)
      }

      viewport?.removeEventListener("resize", updateKeyboardOffset)
      viewport?.removeEventListener("scroll", updateKeyboardOffset)
      window.removeEventListener("orientationchange", updateKeyboardOffset)
      document.removeEventListener("focusin", handleFocusIn)
      document.removeEventListener("focusout", handleFocusOut)
      document.documentElement.style.removeProperty("--login-keyboard-offset")
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    
    try {
      const result = await login({ phone, password })
      if (result && result.success) {
        router.push(result.redirectTo || "/dashboard")
      } else {
        setError(result?.error || "Une erreur est survenue lors de la connexion")
        setIsLoading(false)
      }
    } catch (err: any) {
      setError(err?.error || "Une erreur est survenue lors de la connexion")
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex h-[100dvh] max-h-[100dvh] items-center justify-center overflow-hidden overscroll-none bg-gradient-to-br from-primary-50 via-white to-primary-100 px-3 py-2 sm:px-6 sm:py-8">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-primary-200 opacity-60 mix-blend-multiply blur-xl animate-blob sm:-right-40 sm:-top-40 sm:h-80 sm:w-80 sm:opacity-70"></div>
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-primary-300 opacity-60 mix-blend-multiply blur-xl animate-blob animation-delay-2000 sm:-bottom-40 sm:-left-40 sm:h-80 sm:w-80 sm:opacity-70"></div>
        <div className="absolute left-1/2 top-20 h-40 w-40 -translate-x-1/2 rounded-full bg-primary-100 opacity-50 mix-blend-multiply blur-xl animate-blob animation-delay-4000 sm:left-40 sm:top-40 sm:h-80 sm:w-80 sm:translate-x-0 sm:opacity-70"></div>
      </div>

      <div
        className="relative z-10 w-full max-w-[26rem] transition-transform duration-200 ease-out"
        style={{ transform: "translate3d(0, calc(var(--login-keyboard-offset, 0px) * -1), 0)" }}
      >
        <Card className="max-h-[calc(100svh-1rem)] border-white/60 bg-white/90 shadow-xl backdrop-blur-sm transition-all duration-300 sm:max-h-none sm:rounded-2xl sm:shadow-2xl sm:hover:shadow-3xl">
        <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-2 px-4 pb-4 pt-4 sm:space-y-6 sm:px-6 sm:pb-8 sm:pt-8">
              <div className="hidden justify-center sm:flex">
                <div className="relative">
                  <Image 
                    src="/logo.png" 
                    alt="Logo" 
                    width={120} 
                    height={120} 
                    priority
                    className="h-16 w-16 drop-shadow-lg transition-transform duration-300 sm:h-[120px] sm:w-[120px] sm:hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full opacity-20 blur-xl"></div>
                </div>
              </div>
              
              <div className="space-y-1 text-center sm:space-y-2">
                <CardTitle className="hidden bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-xl font-bold text-transparent sm:block sm:text-2xl">
                  Bienvenue
                </CardTitle>
                <CardDescription className="mx-auto hidden max-w-xs text-sm leading-relaxed text-gray-600 sm:block sm:text-base">
              Connectez-vous à votre compte pour gérer vos factures
            </CardDescription>
              </div>
            {error && (
                <div className="animate-in rounded-lg border border-red-200 bg-red-50 p-3 duration-300 slide-in-from-top-2">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
            )}
          </CardHeader>
            <CardContent className="space-y-3 px-4 sm:space-y-6 sm:px-6">
            <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                Téléphone
              </label>
                <div className="relative">
              <Input
                id="phone"
                    type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Votre numéro de téléphone"
                    className="h-11 rounded-xl border-gray-200 pl-10 text-base transition-all duration-200 focus:border-primary-500 focus:ring-primary-500 sm:h-12"
                    disabled={isLoading}
              />
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                Mot de passe
              </label>
                <div className="relative">
          <Input
                id="password"
                    type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                    placeholder="Votre mot de passe"
                    className="h-11 rounded-xl border-gray-200 pl-10 pr-12 text-base transition-all duration-200 focus:border-primary-500 focus:ring-primary-500 sm:h-12"
                    disabled={isLoading}
                  />
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    disabled={isLoading}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
            </div>
          </CardContent>
            <CardFooter className="flex flex-col space-y-4 px-4 pb-4 pt-4 sm:px-6 sm:pb-8 sm:pt-5">
              <Button 
                className="h-11 w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 font-medium text-white shadow-lg transition-all duration-200 hover:from-primary-700 hover:to-primary-800 hover:shadow-xl active:scale-[0.98] sm:h-12 sm:hover:scale-[1.02]" 
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connexion en cours...
                  </div>
                ) : (
                  "Se connecter"
                )}
            </Button>
          </CardFooter>
        </form>
      </Card>
      </div>
      <style jsx>
        {`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}