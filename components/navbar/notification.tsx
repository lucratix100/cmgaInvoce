'use client'
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { user } from "@/types"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { InvoiceReminder } from "@/lib/types";

export default function Notification({ user }: { user: user }) {
    const router = useRouter();

    // Utiliser le hook TanStack Query pour gérer les notifications
    const {
        notifications,
        isLoading: isLoadingNotifications,
        unreadCount,
        markNotificationAsRead,
        error
    } = useNotifications(Number(user?.id));

    // Gérer les erreurs de chargement
    if (error) {
        console.error("Erreur lors du chargement des notifications:", error);
        toast.error("Erreur lors du chargement des notifications");
    }

    const handleNotificationClick = async (notification: InvoiceReminder) => {
        try {
            if (!notification.read) {
                markNotificationAsRead(notification.id.toString());
            }
            if (notification.invoice?.invoiceNumber) {
                router.push(`/dashboard/invoices/${notification.invoice.invoiceNumber}`);
            }
        } catch (error) {
            console.error("Erreur lors du traitement de la notification:", error);
            toast.error("Erreur lors du traitement de la notification");
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative hover:bg-primary-50 transition-colors">
                    <Bell className="h-5 w-5 text-primary-500 hover:text-primary-700" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border shadow-lg w-96 rounded-lg">
                <div className="p-4 font-semibold text-lg border-b bg-gray-50">Notifications</div>
                <div className="max-h-[400px] overflow-y-auto">
                    {isLoadingNotifications ? (
                        <div className="p-6 text-center text-muted-foreground">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                            Chargement des notifications...
                        </div>
                    ) : unreadCount === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            Aucune notification non lue
                        </div>
                    ) : (
                        notifications.filter(notif => !notif.read).map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className="p-4 hover:bg-gray-50 cursor-pointer border-b last:border-0 transition-colors"
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="w-full space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-primary-600">
                                                    Facture #{notification.invoice?.invoiceNumber}
                                                </span>
                                                {!notification.read && (
                                                    <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
                                                )}
                                            </div>
                                            {notification.user?.name && (
                                                <span className="text-sm font-medium text-gray-700 block">
                                                    {notification.user.name}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                            {format(new Date(notification.remindAt), "dd MMM yyyy", { locale: fr })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                        {notification.comment}
                                    </p>
                                </div>
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-center py-3 font-medium text-primary-600 hover:text-primary-700 hover:bg-gray-50">
                    <Link href="/notifications" className="flex items-center gap-2">
                        Voir toutes les notifications
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}