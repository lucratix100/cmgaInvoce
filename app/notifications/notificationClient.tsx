"use client"

import { useEffect, useState } from "react"
import { getRemindersByInvoice, markReminderAsRead, deleteReminder, getUserReminders } from "@/actions/reminder"
import { InvoiceReminder, User } from "@/lib/types"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Trash2, Check, Search, Bell, FileText, Calendar, Filter, Clock, Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Role } from "@/types/roles"
import { motion, AnimatePresence } from "framer-motion"
import { formatNotificationDate, getNotificationDateText, isNotificationToday, isNotificationYesterday, isNotificationTomorrow } from "@/lib/notification-utils"
import { addDays, startOfDay, endOfDay, isWithinInterval } from "date-fns"

type DateFilter = 'all' | 'today' | 'yesterday' | 'tomorrow' | 'this-week' | 'custom'

const NOTIFICATIONS_PER_PAGE = 7;

export default function NotificationClient({ user }: { user: User }) {
    const router = useRouter()
    const [notifications, setNotifications] = useState<InvoiceReminder[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showRead, setShowRead] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
    const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({
        start: '',
        end: ''
    });
    const [currentPage, setCurrentPage] = useState(1);

    const fetchNotifications = async () => {
        try {
            setIsLoading(true);
            if (!user?.id) {
                toast.error("Vous devez être connecté pour voir vos notifications");
                router.push("/login");
                return;
            }
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

    const handleMarkAllAsRead = async () => {
        try {
            const unreadNotifications = notifications.filter(n => !n.read);
            await Promise.all(unreadNotifications.map(n => markReminderAsRead(n.id.toString())));
            setNotifications(notifications.map(notification => ({ ...notification, read: true })));
            toast.success("Toutes les notifications ont été marquées comme lues");
        } catch (error) {
            toast.error("Erreur lors de la mise à jour des notifications");
        }
    };

    const filterNotificationsByDate = (notification: InvoiceReminder): boolean => {
        const remindDate = new Date(notification.remindAt);
        
        switch (dateFilter) {
            case 'today':
                return isNotificationToday(notification);
            case 'yesterday':
                return isNotificationYesterday(notification);
            case 'tomorrow':
                return isNotificationTomorrow(notification);
            case 'this-week':
                const today = new Date();
                const weekStart = startOfDay(today);
                const weekEnd = endOfDay(addDays(today, 7));
                return isWithinInterval(remindDate, { start: weekStart, end: weekEnd });
            case 'custom':
                if (!customDateRange.start || !customDateRange.end) return true;
                const startDate = startOfDay(new Date(customDateRange.start));
                const endDate = endOfDay(new Date(customDateRange.end));
                return isWithinInterval(remindDate, { start: startDate, end: endDate });
            default:
                return true;
        }
    };

    const filteredNotifications = notifications.filter(notification => {
        const matchesSearch =
            notification.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
            notification.invoice?.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesReadStatus = showRead || !notification.read;
        const matchesDateFilter = filterNotificationsByDate(notification);
        return matchesSearch && matchesReadStatus && matchesDateFilter;
    });

    const unreadCount = notifications.filter(n => !n.read).length;
    const todayCount = notifications.filter(n => isNotificationToday(n)).length;

    // Pagination
    const totalPages = Math.ceil(filteredNotifications.length / NOTIFICATIONS_PER_PAGE);
    const paginatedNotifications = filteredNotifications.slice(
        (currentPage - 1) * NOTIFICATIONS_PER_PAGE,
        currentPage * NOTIFICATIONS_PER_PAGE
    );

    useEffect(() => {
        // Si le filtre change, on revient à la première page
        setCurrentPage(1);
    }, [searchTerm, dateFilter, customDateRange, showRead]);

    // Vérification de l'utilisateur
    if (!user) {
        return (
            <div className="text-center py-8 text-gray-500">
                Chargement de votre session...
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* En-tête avec statistiques */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
                        <p className="text-gray-600">Gérez vos notifications et rappels</p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <div className="bg-blue-50 px-4 py-2 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-blue-600" />
                                <span className="text-sm font-medium text-blue-900">
                                    {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                        <div className="bg-green-50 px-4 py-2 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-green-600" />
                                <span className="text-sm font-medium text-green-900">
                                    {todayCount} aujourd'hui
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions rapides */}
                <div className="flex flex-wrap gap-3 mb-6">
                    {unreadCount > 0 && (
                        <Button
                            onClick={handleMarkAllAsRead}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <Check className="h-4 w-4" />
                            Tout marquer comme lu
                        </Button>
                    )}
                    <Button
                        onClick={() => setShowRead(!showRead)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                    >
                        {showRead ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {showRead ? 'Masquer les lues' : 'Afficher les lues'}
                    </Button>
                </div>
            </div>

            {/* Barre de recherche et filtres */}
            <div className="mb-8 bg-white rounded-xl shadow-sm border p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Recherche */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher par numéro de facture, commentaire..."
                                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    {/* Filtre par date */}
                    <div className="w-full lg:w-72">
                        {/* <label className="block text-sm font-medium text-gray-700 ">Filtrer par date</label> */}
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Toutes les dates</option>
                            <option value="today">Aujourd'hui</option>
                            <option value="yesterday">Hier</option>
                            <option value="tomorrow">Demain</option>
                            <option value="this-week">Cette semaine</option>
                            <option value="custom">Période personnalisée</option>
                        </select>
                    </div>
                </div>
                {/* Période personnalisée */}
                {dateFilter === 'custom' && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                            <input
                                type="date"
                                value={customDateRange.start}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                            <input
                                type="date"
                                value={customDateRange.end}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Résultats */}
            <div className="mb-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        {filteredNotifications.length} notification{filteredNotifications.length > 1 ? 's' : ''} trouvée{filteredNotifications.length > 1 ? 's' : ''}
                    </p>
                    {filteredNotifications.length > 0 && (
                        <Button
                            onClick={() => {
                                setSearchTerm("");
                                setDateFilter('all');
                                setCustomDateRange({ start: '', end: '' });
                            }}
                            variant="ghost"
                            size="sm"
                        >
                            Réinitialiser les filtres
                        </Button>
                    )}
                </div>
            </div>

            {/* Liste des notifications */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-gray-600">Chargement des notifications...</p>
                    </div>
                ) : paginatedNotifications.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl shadow-sm border">
                        <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune notification trouvée</h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm || dateFilter !== 'all' 
                                ? "Essayez de modifier vos critères de recherche ou de filtrage"
                                : "Vous n'avez aucune notification pour le moment"
                            }
                        </p>
                        {(searchTerm || dateFilter !== 'all') && (
                            <Button
                                onClick={() => {
                                    setSearchTerm("");
                                    setDateFilter('all');
                                    setCustomDateRange({ start: '', end: '' });
                                }}
                                variant="outline"
                            >
                                Voir toutes les notifications
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        <AnimatePresence>
                            {paginatedNotifications.map((notification) => (
                                <motion.div
                                    key={notification.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div
                                        className={`p-6 rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md ${
                                            notification.read ? 'bg-white' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
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
                                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                <Clock className="h-4 w-4" />
                                                                {getNotificationDateText(notification.remindAt)}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {!notification.read && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleMarkAsRead(notification.id)}
                                                                    className="hover:bg-green-50 transition-colors duration-200"
                                                                    title="Marquer comme lu"
                                                                >
                                                                    <Check className="h-4 w-4 text-green-600" />
                                                                </Button>
                                                            )}
                                                            <Link
                                                                href={user?.role === Role.RECOUVREMENT
                                                                    ? `/factures/${notification.invoice?.invoiceNumber}`
                                                                    : `/dashboard/invoices/${notification.invoice?.invoiceNumber}`}
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

                                                    {/* Commentaire */}
                                                    <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                                                        <p className="text-gray-700 leading-relaxed">{notification.comment}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {/* Pagination */}
                        <div className="flex justify-center items-center gap-4 mt-8">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                Précédent
                            </Button>
                            <span className="text-sm text-gray-600">
                                Page {currentPage} sur {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Suivant
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
} 