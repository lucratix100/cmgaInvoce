import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserReminders, markReminderAsRead } from '@/actions/reminder';
import { toast } from 'sonner';
import { InvoiceReminder } from '@/lib/types';

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
        refetchInterval: 1 * 60 * 1000, // Refetch toutes les 5 minutes
        refetchIntervalInBackground: true, // Continue le refetch même quand l'onglet n'est pas actif
        staleTime: 2 * 60 * 1000, // Les données sont considérées comme fraîches pendant 2 minutes
        gcTime: 10 * 60 * 1000, // Garde les données en cache pendant 10 minutes
    });

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

    // Calculer le nombre de notifications non lues
    const unreadCount = notifications.filter(notif => !notif.read).length;

    return {
        notifications,
        isLoading,
        error,
        unreadCount,
        markNotificationAsRead,
        refetch,
        isMarkingAsRead: markAsReadMutation.isPending
    };
} 