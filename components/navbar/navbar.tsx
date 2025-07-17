"use client";

import { Button } from "@/components/ui/button";
import { Bell, ChevronDown, LogOut, User } from "lucide-react";
import { FileText, Building } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";

import Logout from "../logout";
import { depot, user } from "@/types";
import { Suspense, useState } from "react";
import Notification from "./notification";
import { usePathname } from "next/navigation";

const NAVBAR_TITLE = {
  "/dashboard": "Statistiques",
  "/dashboard/invoices": "Gestion des Factures",
  "/dashboard/drivers": "Gestion des conducteurs",
  "/dashboard/users": "Gestion des utilisateurs",
  "/dashboard/recouvrement": "Gestion des recouvrements",
  "/dashboard/depots": "Gestion des dépôts",
  "/dashboard/assignments": "Gestion des affectations",
  "/dashboard/activities": "Gestion des activités",
}

function HeaderContent({ user }: { user: user }) {
  const pathname = usePathname();
  const title = NAVBAR_TITLE[pathname as keyof typeof NAVBAR_TITLE];
  return (
    <div className="flex h-14 items-center px-4 md:px-6">
      <div className="flex items-center gap-2 text-primary">
        <FileText className="h-6 w-6" />
        <span className="text-lg font-semibold">{title}</span>
      </div>

      <div className="flex items-center gap-2 ml-auto mr-4">
        <div className="flex items-center gap-4 relative">
          {user?.role !== "CONTROLEUR" && user?.role !== "MAGASINIER" && (
            <Notification user={user} />
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 hover:bg-primary-50 transition-colors"
            >
              <Avatar className="h-8 w-8 border-2 border-primary-100">
                <AvatarFallback className="bg-primary text-white">
                  {user?.firstname?.toUpperCase()[0] || ""}
                  {user?.lastname?.toUpperCase()[0] || ""}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <div className="text-start">
                  <p className="text-sm font-medium text-gray-700">
                    {user?.firstname} {user?.lastname}
                  </p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-white border shadow-md p-1"
          >
            <DropdownMenuItem
              asChild
              className="hover:bg-primary-50 focus:bg-primary-50 cursor-pointer py-2 px-3 rounded-md"
            >
              <Link href="/profil" className="flex items-center">
                <User className="mr-2 h-4 w-4 text-primary" />
                <span className="text-gray-700">Mon profil</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 bg-gray-100" />
            {/* <DropdownMenuItem className="hover:bg-red-50 focus:bg-red-50 cursor-pointer py-2 px-3 rounded-md text-red-600 focus:text-red-700"> */}
            <Logout />
            {/* </DropdownMenuItem> */}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}


// Composant principal qui utilise Suspense
export default function Header({ user }: { user: user }) {

  return (
    <header className="border-b bg-white shadow-sm sticky top-0 z-50">
      <Suspense
        fallback={
          <div className="flex h-20 items-center px-4 md:px-6">
            <div className="flex items-center gap-2 text-primary">
              <FileText className="h-6 w-6" />
              <span className="text-lg font-semibold">
                {/* {title || "Gestion des Facturessssssss"} */}
              </span>
            </div>
            <div className="ml-auto">
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
            </div>
          </div>
        }
      >
        <HeaderContent user={user} />
      </Suspense>
    </header>
  );
}
