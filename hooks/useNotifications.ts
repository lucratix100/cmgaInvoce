import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserReminders, markReminderAsRead } from '@/actions/reminder';
import { toast } from 'sonner';
import { InvoiceReminder } from '@/lib/types';
import { filterTodayNotifications, filterTodayUnreadNotifications } from '@/lib/notification-utils';

export function useNotifications(userId: number) {
    const queryClient = useQueryClient();

    // Query pour récupérer les notifications
    const {
        data: notifications = [],
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['notifications', userId],
        queryFn: () => getUserReminders(userId),
        enabled: !!userId,
        retry: false,
        refetchInterval: 30 * 1000, // Refetch toutes les 30 secondes
        refetchIntervalInBackground: true, // Continue le refetch même quand l'onglet n'est pas actif
        staleTime: 15 * 1000, // Les données sont considérées comme fraîches pendant 2 minutes
        gcTime: 5 * 1000, // Garde les données en cache pendant 5 minutes
    });

    // Filtrer les notifications du jour
    const todayNotifications = filterTodayNotifications(notifications);

    // Mutation pour marquer une notification comme lue
    const markAsReadMutation = useMutation({
        mutationFn: (notificationId: string) => markReminderAsRead(notificationId),
        onSuccess: (_, notificationId) => {
            // Optimistic update - mettre à jour le cache immédiatement
            queryClient.setQueryData(['notifications', userId], (oldData: InvoiceReminder[] | undefined) => {
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