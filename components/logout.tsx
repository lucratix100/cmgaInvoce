"use client"

import { LogOut } from "lucide-react"
import { DropdownMenuItem } from "./ui/dropdown-menu"
import logout from "@/actions/logout"
import { useToast } from "./ui/use-toast"
import { useTransition } from "react"

export default function Logout() {
    const { toast } = useToast()
    const [isPending, startTransition] = useTransition();

    const onLogout = () => {
      startTransition(async () => {
        try {
          const result = await logout();
          
          if (result?.success) {
            toast({
              title: "Succès",
              description: result.success
            });
            // Force le rafraîchissement complet
            window.location.replace('/');
          } else if (result?.error) {
            toast({
              variant: "destructive",
              title: "Erreur",
              description: result.error
            });
          }
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Erreur",
            description: "Une erreur est survenue"
          });
        }
      });
    };

    return (
        <DropdownMenuItem 
            onClick={onLogout} 
            disabled={isPending}
            className="text-red-600 cursor-pointer"
        >
            <LogOut className={`mr-2 h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
            {isPending ? 'Déconnexion...' : 'Déconnexion'}
        </DropdownMenuItem>
    )
}