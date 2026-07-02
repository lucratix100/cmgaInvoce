"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, LogOut, Home, FileText, History, ShoppingCart, Menu, X, BriefcaseBusiness } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { getAgentFollowUps } from "@/actions/agent-actions"
import Notification from "@/components/navbar/notification"
import { activePageRefetchOptions, queryKeys } from "@/lib/query-keys"

export function AgentNavbar({ user }: { user?: any }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { data: followUps = [] } = useQuery({
    queryKey: queryKeys.agentFollowUps(),
    queryFn: () => getAgentFollowUps(),
    ...activePageRefetchOptions,
  })
  const followUpCount = followUps.length
  const displayName = `${user?.firstname || ""} ${user?.lastname || ""}`.trim() || user?.email || user?.phone || "Agent commercial"
  const userInitials = `${user?.firstname?.[0] || ""}${user?.lastname?.[0] || ""}`.trim()
    || displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0])
      .join("")
    || "AG"

  const navItems = [
    { href: "/agents", label: "Accueil", icon: Home },
    { href: "/agent-factures", label: "Mes factures", icon: FileText },
    { href: "/historiques", label: "Historique", icon: History },
    { href: "/commandes", label: "Bons de commande", icon: ShoppingCart },
  ]
  const mobileNavItems = [
    { href: "/agents", label: "Accueil", icon: Home },
    { href: "/portefeuille", label: "Portefeuille", icon: BriefcaseBusiness },
    { href: "/agent-factures", label: "Mes factures", icon: FileText },
    { href: "/historiques", label: "Historique", icon: History },
  ]

  const isActive = (href: string) => {
    if (href === "/agents") return pathname === "/agents"
    return pathname.startsWith(href)
  }

  const handleNavClick = (href: string) => {
    router.push(href)
    setMobileMenuOpen(false)
  }

  const handleRelancesClick = () => {
    if (pathname === "/agents") {
      window.dispatchEvent(new CustomEvent("agent-show-relances"))
    }
    router.push("/agents?relances=1")
    setMobileMenuOpen(false)
  }

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="flex items-center">
            <div className="shrink-0">
              <Image src="/logo.png" alt="Logo CMGA" width={90} height={90} className="h-10 w-auto" />
            </div>
          </div>

          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                    active
                      ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                      : "text-muted-foreground hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              title="Portefeuille"
              aria-label="Portefeuille"
              onClick={() => handleNavClick("/portefeuille")}
              className={cn(
                "hidden h-9 w-9 rounded-xl border-slate-200 bg-white md:inline-flex",
                isActive("/portefeuille")
                  ? "border-primary/30 bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <BriefcaseBusiness className="h-4 w-4" />
            </Button>

            {user && <Notification user={user} />}

            <Button
              variant="outline"
              size="icon"
              title="Bons de commande"
              aria-label="Bons de commande"
              onClick={() => handleNavClick("/commandes")}
              className={cn(
                "h-9 w-9 rounded-xl border-slate-200 bg-white md:hidden",
                isActive("/commandes")
                  ? "border-primary/30 bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>

            {followUpCount > 0 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  title="Relances"
                  aria-label={`Relances (${followUpCount})`}
                  onClick={handleRelancesClick}
                  className="relative h-9 w-9 rounded-xl border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 md:hidden"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white">
                    {followUpCount}
                  </span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="relative hidden border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 md:inline-flex"
                  onClick={handleRelancesClick}
                >
                  <Bell className="mr-1.5 h-4 w-4" />
                  Relances
                  <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {followUpCount}
                  </span>
                </Button>
              </>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="/placeholder-user.jpg" alt={displayName} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {userInitials.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52" align="end">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">CMGA Delivery</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/logout")}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t bg-white md:hidden">
          <div className="space-y-1 px-2 py-2">
            {mobileNavItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}
