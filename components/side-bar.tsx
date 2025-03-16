"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Building, BarChart3, FileText, Truck, Users } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function SideBar() {
    
    const pathname = usePathname()
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const isActive = (path: string) => {
        return pathname === path
      }

    return (
        <div
            className={`bg-white border-r fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:relative md:translate-x-0 ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
style={{ width: "280px" }}
>
<div className="flex flex-col h-full">
  <div className="border-b p-4">
    <div className="flex items-center gap-2 justify-center">
      <Image src="/logo.png" alt="logo" width={100} height={100} />
    </div>
  </div>

  <div className="flex flex-col flex-1 p-4 space-y-1">
    <Button
      variant={isActive("/dashboard") ? "default" : "ghost"}
      className={isActive("/dashboard") ? "justify-start" : "justify-start hover:bg-primary-50"}
      asChild
    >
      <Link href="/dashboard">
        <BarChart3 className="mr-2 h-4 w-4" />
        Aperçu global
      </Link>
    </Button>
    <Button
      variant={isActive("/dashboard/invoices") ? "default" : "ghost"}
      className={isActive("/dashboard/invoices") ? "justify-start" : "justify-start hover:bg-primary-50"}
      asChild
    >
      <Link href="/dashboard/invoices">
        <FileText className="mr-2 h-4 w-4" />
        Gestion des factures
      </Link>
    </Button>
    <Button
      variant={isActive("/dashboard/depots") ? "default" : "ghost"}
      className={isActive("/dashboard/depots") ? "justify-start" : "justify-start hover:bg-primary-50"}
      asChild
    >
      <Link href="/dashboard/depots">
        <Building className="mr-2 h-4 w-4" />
        Gestion des dépôts
      </Link>
    </Button>
    <Button
      variant={isActive("/dashboard/drivers") ? "default" : "ghost"}
      className={isActive("/dashboard/drivers") ? "justify-start" : "justify-start hover:bg-primary-50"}
      asChild
    >
      <Link href="/dashboard/drivers">
        <Truck className="mr-2 h-4 w-4" />
        Gestion des chauffeurs
      </Link>
    </Button>
    <Button
      variant={isActive("/dashboard/users") ? "default" : "ghost"}
      className={isActive("/dashboard/users") ? "justify-start" : "justify-start hover:bg-primary-50"}
      asChild
    >
      <Link href="/dashboard/users">
        <Users className="mr-2 h-4 w-4" />
        Gestion des utilisateurs
      </Link>
    </Button>
  </div>
</div>
        </div>
    )
}
