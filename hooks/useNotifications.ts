import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserReminders, markReminderAsRead } from '@/actions/reminder';
import { toast } from 'sonner';
import { InvoiceReminder } from '@/lib/types';
import { filterTodayNotifications, filterTodayUnreadNotifications } from '@/lib/notification-utils';
import { queryKeys, QUERY_REFETCH_INTERVAL } from '@/lib/query-keys';

export function useNotifications(userId: number, options?: { enabled?: boolean }) {
    const queryClient = useQueryClient();
    const isEnabled = (options?.enabled ?? true) && userId > 0;

    // Query pour récupérer les notifications
    const {
        data: notifications = [],
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: queryKeys.notifications(userId),
        queryFn: () => getUserReminders(userId),
        enabled: isEnabled,
        retry: false,
        refetchInterval: isEnabled ? QUERY_REFETCH_INTERVAL : false,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: isEnabled,
        refetchOnReconnect: isEnabled,
        staleTime: 15 * 1000,
        gcTime: 5 * 1000,
    });

    // Filtrer les notifications du jour
    const todayNotifications = filterTodayNotifications(notifications);

    // Mutation pour marquer une notification comme lue
    const markAsReadMutation = useMutation({
        mutationFn: (notificationId: string) => markReminderAsRead(notificationId),
        onSuccess: (_, notificationId) => {
            // Optimistic update - mettre à jour le cache immédiatement
            queryClient.setQueryData(queryKeys.notifications(userId), (oldData: InvoiceReminder[] | undefined) => {
                if (!oldData) return oldData;
                return oldData.map(notif =>
                    notif.id.toString() === notificationId ? { ...notif, read: true } : notif
                );
            });

            toast.success('Notification marquée comme lue');
        },
        onError: (error) => {
            console.error('Erreur lors du marquage de la notification:', error);
            toast.error('Erreur lors du marquage de la notification');

            // En cas d'erreur, refetch les données pour s'assurer de la cohérence
            refetch();
        }
    });

    // Fonction pour marquer une notification comme lue
    const markNotificationAsRead = (notificationId: string) => {
        markAsReadMutation.mutate(notificationId);
    };

    // Calculer le nombre de notifications non lues (toutes)
    const unreadCount = notifications.filter(notif => !notif.read).length;

    // Calculer le nombre de notifications non lues pour aujourd'hui seulement
    const todayUnreadCount = filterTodayUnreadNotifications(notifications).length;

    return {
        notifications,
        todayNotifications,
        isLoading,
        error,
        unreadCount,
        todayUnreadCount,
        markNotificationAsRead,
        refetch,
        isMarkingAsRead: markAsReadMutation.isPending
    };
} 