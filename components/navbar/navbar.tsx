"use client";

import { Button } from "@/components/ui/button";
import { Bell, ChevronDown, LogOut, User } from "lucide-react";
import { FileText, Building } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getDepots } from "@/actions/depot";
import { getCurrentUser } from "@/actions/user";
import Logout from "../logout";
import { depot } from "@/types";
import { Suspense } from "react";

// Ajouter cette interface au début du fichier
interface Notification {
  id: number;
  title: string;
  message: string;
  read: boolean;
  date: Date;
  factureId: number;
  userId: number;
}

function HeaderContent() {
  const [depot, setDepot] = useState("");
  const [depots, setDepots] = useState<depot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  
  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsUserLoading(true);
        const data = await getCurrentUser();
        setUser(data);
      } catch (err) {
        console.error("Erreur lors du chargement de l'utilisateur:", err);
      } finally {
        setIsUserLoading(false);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!isUserLoading && user && user.role !== "ADMIN") {
      async function loadDepots() {
        try {
          setLoading(true);
          const data = await getDepots();
          setDepots(data);
          if (data.length > 0) {
            setDepot(data[0].id.toString());
          }
        } catch (err) {
          setError("Erreur lors du chargement des dépôts");
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
      loadDepots();
    }
  }, [user, isUserLoading]);

  const totalNotificationsNonLues = notifications.filter(notif => !notif.read).length;

  // Ajouter cet useEffect pour charger les notifications
  useEffect(() => {
    if (user?.id) {
      // Simulation de données - À remplacer par un appel API réel
      const mockNotifications: Notification[] = [
        {
          id: 1,
          title: "Rappel de facture",
          message: "La facture #123 nécessite votre attention",
          read: false,
          date: new Date(),
          factureId: 123,
          userId: user.id
        },
        {
          id: 2,
          title: "Rappel de facture",
          message: "La facture #456 est en attente depuis 3 jours",
          read: false,
          date: new Date(),
          factureId: 456,
          userId: user.id
        }
      ];

      setNotifications(mockNotifications);

      // Remplacer par votre appel API réel
      // const loadNotifications = async () => {
      //   try {
      //     const response = await fetch(`/api/notifications/${user.id}`);
      //     const data = await response.json();
      //     setNotifications(data);
      //   } catch (error) {
      //     console.error("Erreur lors du chargement des notifications:", error);
      //   }
      // };
      // loadNotifications();
    }
  }, [user]);

  // Fonction pour marquer une notification comme lue
  const markAsRead = (notificationId: number) => {
    setNotifications(notifications.map(notif => 
      notif.id === notificationId ? { ...notif, read: true } : notif
    ));
  };

  return (
    <div className="flex h-20 items-center px-4 md:px-6">
      <div className="flex items-center gap-2 text-primary">
        <FileText className="h-6 w-6" />
        <span className="text-lg font-semibold">Gestion des Factures</span>
      </div>

      <div className="flex items-center gap-2 ml-auto mr-4">
        <div className="flex items-center gap-4 relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative hover:bg-primary-50 transition-colors">
                  <Bell className="h-5 w-5 text-primary-500 hover:text-primary-700" />
                  {totalNotificationsNonLues > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {totalNotificationsNonLues}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border shadow-md w-80">
                <div className="p-2 font-medium border-b">Notifications</div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.map((notification, index) => (
                    <DropdownMenuItem key={`${notification.id}-${index}`} className="p-3 hover:bg-primary-50 cursor-pointer bg-white border-b last:border-0">
                      <div className="w-full">
                          <div className="flex justify-between items-start">
                            <div className="font-medium flex items-center gap-2">
                              <span>Facture {notification.factureId}</span>
                              {!notification.read && <span className="h-2 w-2 rounded-full bg-red-500"></span>}
                            </div>
                            <span className="text-xs text-muted-foreground">{notification.date.toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm mt-1">{notification.message}</p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  {notifications.every((n) => n.read === true) && (
                    <div className="p-4 text-center text-muted-foreground">Aucune notification</div>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-center font-medium text-primary">
                  <Link href="/notifications" className="hover:text-primary-700 cursor-pointer">Voir toutes les notifications</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
        {/* select depot */}
        {/* {!isUserLoading && user?.role !== "ADMIN" && (
          <Select value={depot} onValueChange={setDepot} disabled={loading}>
            <SelectTrigger className="w-[180px] border-dashed bg-primary-50 hover:bg-primary-100 transition-colors">
              <Building className="h-4 w-4 mr-2 text-primary" />
              <SelectValue
                placeholder={
                  loading ? "Chargement..." : "Sélectionner un dépôt"
                }
              />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-md">
              {error ? (
                <SelectItem value="error" disabled className="text-red-500">
                  {error}
                </SelectItem>
              ) : (
                depots.map((depot) => (
                  <SelectItem
                    key={depot.id}
                    value={depot.id.toString()}
                    className="hover:bg-primary-50 focus:bg-primary-50 cursor-pointer py-2"
                  >
                    {depot.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )} */}
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
            <DropdownMenuItem className="hover:bg-red-50 focus:bg-red-50 cursor-pointer py-2 px-3 rounded-md text-red-600 focus:text-red-700">
              <Logout />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Composant principal qui utilise Suspense
export default function Header() {
  return (
    <header className="border-b bg-white shadow-sm sticky top-0 z-50">
      <Suspense
        fallback={
          <div className="flex h-20 items-center px-4 md:px-6">
            <div className="flex items-center gap-2 text-primary">
              <FileText className="h-6 w-6" />
              <span className="text-lg font-semibold">
                Gestion des Factures
              </span>
            </div>
            <div className="ml-auto">
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
            </div>
          </div>
        }
      >
        <HeaderContent />
      </Suspense>
    </header>
  );
}
