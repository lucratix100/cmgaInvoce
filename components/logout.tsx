"use client"

import { LogOut } from "lucide-react"
import { DropdownMenuItem } from "./ui/dropdown-menu"
import logout from "@/actions/logout"
import { useToast } from "./ui/use-toast"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { clearAuthQueries } from "@/lib/clear-auth-queries"

export default function Logout() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const onLogout = async () => {
    setIsLoading(true);
    try {
      clearAuthQueries(queryClient);
      const result = await logout();

      if (result?.success) {
        toast({
          title: "Succès",
          description: result.success
        });
        await new Promise(resolve => setTimeout(resolve, 100));
        router.replace('/');
      } else if (result?.error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error
        });
      }
    } catch (error) {
      console.log("error", error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenuItem
      onClick={onLogout}
      disabled={isLoading}
      className="text-red-600 cursor-pointer"
    >
      <LogOut className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
      {isLoading ? 'Déconnexion...' : 'Déconnexion'}
    </DropdownMenuItem>
  )
}