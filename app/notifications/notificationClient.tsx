"use client"

import { useEffect, useMemo, useState } from "react"
import { deleteReminder, markReminderAsRead } from "@/actions/reminder"
import { InvoiceReminder, User } from "@/lib/types"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bell, Calendar, Check, Clock, Eye, EyeOff, FileText, Search, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { getNotificationDateText, isNotificationToday, isNotificationYesterday, isNotificationTomorrow } from "@/lib/notification-utils"
import { addDays, endOfDay, isWithinInterval, startOfDay } from "date-fns"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { useQueryClient } from "@tanstack/react-query"
import { useNotifications } from "@/hooks/useNotifications"
import { queryKeys } from "@/lib/query-keys"
import { getNotificationTargetHref } from "@/lib/notification-routes"

type DateFilter = 'all' | 'today' | 'yesterday' | 'tomorrow' | 'this-week' | 'custom'

const NOTIFICATIONS_PER_PAGE = 10

export default function NotificationClient({ user }: { user: User }) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState("");
    const [showRead, setShowRead] = useState(true);
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
    const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({
        start: '',
        end: ''
    });
    const queryClient = useQueryClient()
    const userId = Number(user?.id || 0)
    const {
        notifications,
        isLoading,
        markNotificationAsRead,
    } = useNotifications(userId)

    const handleMarkAsRead = async (id: number) => {
        markNotificationAsRead(id.toString());
    };

    const handleOpenNotification = (notification: InvoiceReminder) => {
        if (!notification.read) {
            markNotificationAsRead(notification.id.toString());
        }
        router.push(getNotificationTargetHref(notification, user?.role));
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteReminder(id.toString());
            queryClient.setQueryData(queryKeys.notifications(userId), (oldData: InvoiceReminder[] | undefined) =>
                oldData ? oldData.filter(notification => notification.id !== id) : oldData
            );
            toast.success("Notification supprimée");
        } catch (error) {
            toast.error("Erreur lors de la suppression de la notification");
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const unreadNotifications = notifications.filter(n => !n.read);
            await Promise.all(unreadNotifications.map(n => markReminderAsRead(n.id.toString())));
            queryClient.setQueryData(queryKeys.notifications(userId), (oldData: InvoiceReminder[] | undefined) =>
                oldData ? oldData.map(notification => ({ ...notification, read: true })) : oldData
            );
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

    const filteredNotifications = useMemo(() => notifications.filter(notification => {
        const matchesSearch =
            notification.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (notification.invoice?.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
        const matchesReadStatus = showRead || !notification.read;
        const matchesDateFilter = filterNotificationsByDate(notification);
        return matchesSearch && matchesReadStatus && matchesDateFilter;
    }), [notifications, searchTerm, showRead, dateFilter, customDateRange]);

    const unreadCount = notifications.filter(n => !n.read).length;
    const todayCount = notifications.filter(n => isNotificationToday(n)).length;

    const columns = useMemo<ColumnDef<InvoiceReminder>[]>(() => [
        {
            id: "notification",
            header: "Notification",
            cell: ({ row }) => {
                const notification = row.original
                return (
                    <button
                        type="button"
                        onClick={() => handleOpenNotification(notification)}
                        className="block w-full space-y-1 text-left"
                    >
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                                {notification.invoice?.invoiceNumber
                                    ? `Facture ${notification.invoice.invoiceNumber}`
                                    : "Notification"}
                            </span>
                            {!notification.read && (
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                            )}
                        </div>
                        <p className="line-clamp-2 text-sm text-gray-600">{notification.comment}</p>
                    </button>
                )
            },
        },
        {
            id: "date",
            header: "Date",
            cell: ({ row }) => (
                <div className="flex items-center gap-2 whitespace-nowrap text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    {getNotificationDateText(row.original.remindAt)}
                </div>
            ),
        },
        {
            id: "status",
            header: "Statut",
            cell: ({ row }) => (
                <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        row.original.read
                            ? "bg-gray-100 text-gray-600"
                            : "bg-blue-100 text-blue-700"
                    }`}
                >
                    {row.original.read ? "Lu" : "Non lu"}
                </span>
            ),
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const notification = row.original

                return (
                    <div className="flex justify-end gap-2">
                        {!notification.read && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMarkAsRead(notification.id)}
                                title="Marquer comme lu"
                            >
                                <Check className="h-4 w-4 text-green-600" />
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenNotification(notification)}
                        >
                            <FileText className="mr-2 h-4 w-4 text-blue-600" />
                            Ouvrir
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(notification.id)}
                            title="Supprimer"
                        >
                            <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                    </div>
                )
            },
        },
    ], [notifications, user?.role])

    const table = useReactTable({
        data: filteredNotifications,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: NOTIFICATIONS_PER_PAGE,
            },
        },
    })

    useEffect(() => {
        table.setPageIndex(0)
    }, [searchTerm, dateFilter, customDateRange, showRead, table])

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

            {/* Tableau des notifications */}
            <div className="rounded-xl border bg-white shadow-sm">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-gray-600">Chargement des notifications...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="text-center py-12">
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
                    <div>
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id} className={header.id === "actions" ? "text-right" : ""}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(header.column.columnDef.header, header.getContext())}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows.map((row) => (
                                    <TableRow key={row.id} className={!row.original.read ? "bg-blue-50/50" : ""}>
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className={cell.column.id === "actions" ? "text-right" : ""}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-sm text-gray-600">
                                Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()}
                            </span>
                            <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                Précédent
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                Suivant
                            </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 