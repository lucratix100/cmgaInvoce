"use client"

import { useEffect, useState } from "react"
import { getRemindersByInvoice, markReminderAsRead, deleteReminder, getUserReminders } from "@/actions/reminder"
import { InvoiceReminder, User } from "@/lib/types"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Trash2, Check, Search, Bell, FileText } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Role } from "@/types/roles"
import { motion, AnimatePresence } from "framer-motion"

export default function NotificationClient({ user }: { user: User }) {
    const { isLoading: isAuthLoading } = useAuth()
    const router = useRouter()
    const [notifications, setNotifications] = useState<InvoiceReminder[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showRead, setShowRead] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    // useEffect(() => {
    //     if (!isAuthLoading && !user) {
    //         toast.error("Vous devez être connecté pour accéder à cette page");
    //         router.push("/login");
    //         return;
    //     }
    // }, [user, router, isAuthLoading]);


    const fetchNotifications = async () => {
        try {
            setIsLoading(true);
            // if (!user?.id) {
            //     toast.error("Vous devez être connecté pour voir vos notifications");
            //     router.push("/login");
            //     return;
            // }
            const data = await getUserReminders(Number(user.id));

            if (Array.isArray(data)) {
                setNotifications(data);
            } else {
                console.error("Les données reçues ne sont pas un tableau:", data);
                toast.error("Format de données invalide");
            }
        } catch (error) {
            console.error("Erreur détaillée:", error);
            toast.error("Erreur lors de la récupération des notifications");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchNotifications();
        }
    }, [user]);

    const handleMarkAsRead = async (id: number) => {
        try {
            await markReminderAsRead(id.toString());
            setNotifications(notifications.map(notification =>
                notification.id === id ? { ...notification, read: true } : notification
            ));
            toast.success("Notification marquée comme lue");
        } catch (error) {
            toast.error("Erreur lors de la mise à jour de la notification");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteReminder(id.toString());
            setNotifications(notifications.filter(notification => notification.id !== id));
            toast.success("Notification supprimée");
        } catch (error) {
            toast.error("Erreur lors de la suppression de la notification");
        }
    };

    const filteredNotifications = notifications.filter(notification => {
        const matchesSearch =
            notification.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
            notification.invoice?.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            notification.invoice?.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            notification.invoice?.accountNumber.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesReadStatus = showRead || !notification.read;
        return matchesSearch && matchesReadStatus;
    });

    if (isAuthLoading) {
        return (
            <div className="text-center py-8 text-gray-500" >
                Chargement de votre session...
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Notifications</h1>
                <p className="text-gray-600">Gérez vos notifications et rappels</p>
            </div>

            {/* Barre de recherche et filtres */}
            <div className="mb-8 bg-white rounded-xl shadow-sm p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher par numéro de facture, client, commentaire..."
                                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={showRead}
                                onChange={(e) => setShowRead(e.target.checked)}
                                className="form-checkbox h-5 w-5 text-blue-600 rounded transition-all duration-200"
                            />
                            <span className="text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                                Afficher les notifications lues
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Liste des notifications */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-gray-600">Chargement des notifications...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                        <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 text-lg">Aucune notification trouvée</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {filteredNotifications.map((notification) => (
                            <motion.div
                                key={notification.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div
                                    className={`p-6 rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md ${notification.read ? 'bg-white' : 'bg-blue-50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex flex-col gap-4">
                                                {/* En-tête de la notification */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-lg text-gray-900">
                                                                Facture {notification.invoice?.invoiceNumber}
                                                            </span>
                                                            {!notification.read && (
                                                                <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 animate-pulse" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {!notification.read && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleMarkAsRead(notification.id)}
                                                                className="hover:bg-green-50 transition-colors duration-200"
                                                            >
                                                                <Check className="h-4 w-4 text-green-600" />
                                                            </Button>
                                                        )}
                                                        <Link
                                                            href={user?.role === Role.RECOUVREMENT
                                                                ? `/factures/${notification.invoice?.invoiceNumber}`
                                                                : `/dashboard/invoices/${notification.invoice?.invoiceNumber}?clientId=${notification.invoice?.customer?.id}`}
                                                        >
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="flex items-center gap-2 hover:bg-blue-50 transition-colors duration-200"
                                                            >
                                                                <FileText className="h-4 w-4 text-blue-600" />
                                                                <span>Voir la facture</span>
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </div>

                                                {/* Informations du client */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                                    {notification.invoice?.customer?.name && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-gray-500">Client:</span>
                                                            <span className="text-gray-900">{notification.invoice.customer.name}</span>
                                                        </div>
                                                    )}
                                                    {notification.invoice?.accountNumber && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-gray-500">N° Compte:</span>
                                                            <span className="text-gray-900">{notification.invoice.accountNumber}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Commentaire */}
                                                <div className="bg-white p-4 rounded-lg border">
                                                    <p className="text-gray-700">{notification.comment}</p>
                                                </div>

                                                {/* Date */}
                                                <div className="flex items-center justify-end">
                                                    <span className="text-sm text-gray-500 flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        {format(new Date(notification.remindAt), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
} 