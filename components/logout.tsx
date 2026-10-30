"use client"

import { LogOut } from "lucide-react"
import { DropdownMenuItem } from "./ui/dropdown-menu"
import logout from "@/actions/logout"
import { useToast } from "./ui/use-toast"
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { clearAuthQueries } from "@/lib/clear-auth-queries"
import { SidebarMenuButton, SidebarMenuItem } from "./ui/sidebar"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type LogoutVariant = "dropdown" | "sidebar"

type LogoutProps = {
  variant?: LogoutVariant
  className?: string
}

export default function Logout({ variant = "dropdown", className }: LogoutProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const queryClient = useQueryClient()

  const openConfirm = () => setConfirmOpen(true)

  const onLogout = async () => {
    setIsLoading(true)
    setConfirmOpen(false)

    try {
      clearAuthQueries(queryClient)
      const result = await logout()

      if (result?.error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        })
        setIsLoading(false)
        return
      }

      // Navigation hard : évite le crash React lié au swap ChatProvider / layout auth
      window.location.assign("/")
    } catch (error) {
      console.log("error", error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue",
      })
      setIsLoading(false)
    }
  }

  const label = isLoading ? "Déconnexion..." : "Déconnexion"
  const iconClassName = cn("h-4 w-4", isLoading && "animate-spin")

  const confirmDialog = (
    <AlertDialog
      open={confirmOpen}
      onOpenChange={(open) => {
        if (!isLoading) setConfirmOpen(open)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la déconnexion</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir vous déconnecter ? Vous devrez vous reconnecter pour accéder à votre espace.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isLoading}
            onClick={() => void onLogout()}
          >
            {isLoading ? "Déconnexion..." : "Se déconnecter"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  if (variant === "sidebar") {
    return (
      <>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={openConfirm}
            disabled={isLoading}
            tooltip="Déconnexion"
            className={cn(
              "text-red-600 hover:bg-red-50 hover:text-red-700",
              className
            )}
          >
            <LogOut className={iconClassName} />
            <span>{label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {confirmDialog}
      </>
    )
  }

  return (
    <>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault()
          openConfirm()
        }}
        disabled={isLoading}
        className={cn("text-red-600 cursor-pointer", className)}
      >
        <LogOut className={cn("mr-2", iconClassName)} />
        {label}
      </DropdownMenuItem>
      {confirmDialog}
    </>
  )
}
