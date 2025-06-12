'use client'
import { useState, useEffect } from "react";
import { user } from "@/types"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getUserReminders, markReminderAsRead } from "@/actions/reminder";

interface Notification {
    id: number;
    comment: string;
    read: boolean;
    remindAt: string;
    invoiceId: number;
    invoice?: {
        id: number;
        invoiceNumber: string;
        status: string;
        accountNumber: string;
        customer?: {
            id: number;
            name: string;
            email: string;
            phone: string;
        };
    };
}
export default function Notification({ user }: { user: user }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
    const router = useRouter();
    useEffect(() => {
        if (user?.id) {
            const loadNotifications = async () => {
                try {
                    setIsLoadingNotifications(true);
                    const data = await getUserReminders(Number(user.id));
                    console.log(data, "userReminders")
                    setNotifications(data as Notification[]);
                } catch (error) {
                    console.error("Erreur lors du chargement des notifications:", error);
                    toast.error("Erreur lors du chargement des notifications");
                } finally {
                    setIsLoadingNotifications(false);
                }
            };
            loadNotifications();
        }
    }, [user]);
    const handleNotificationClick = async (notification: Notification) => {
        try {
            if (!notification.read) {
                await markReminderAsRead(notification.id.toString());
                setNotifications(notifications.map(notif =>
                    notif.id === notification.id ? { ...notif, read: true } : notif
                ));
            }
            if (notification.invoice?.invoiceNumber) {
                router.push(`/dashboard/invoices/${notification.invoice.invoiceNumber}`);
            }
        } catch (error) {
            console.error("Erreur lors du traitement de la notification:", error);
            toast.error("Erreur lors du traitement de la notification");
        }
    };
    const totalNotificationsNonLues = notifications.filter(notif => !notif.read).length;

    return (
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
            <DropdownMenuContent align="end" className="bg-white border shadow-lg w-96 rounded-lg">
                <div className="p-4 font-semibold text-lg border-b bg-gray-50">Notifications</div>
                <div className="max-h-[400px] overflow-y-auto">
                    {isLoadingNotifications ? (
                        <div className="p-6 text-center text-muted-foreground">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                            Chargement des notifications...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            Aucune notification
                        </div>
                    ) : (
                        notifications.map((notification) => (
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
                                            {notification.invoice?.customer?.name && (
                                                <span className="text-sm font-medium text-gray-700 block">
                                                    {notification.invoice.customer.name}
                                                </span>
                                            )}
                                            {notification.invoice?.accountNumber && (
                                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                    Compte: {notification.invoice.accountNumber}
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