import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getRecentActivities } from '@/actions/user-activities';
import { UserActivity } from '@/actions/user-activities';

export function useRecentActivities() {
    const queryClient = useQueryClient();
    
    const {
        data: activities = [],
        isLoading,
        error,
        refetch,
        isFetching
    } = useQuery({
        queryKey: ['recent-activities'],
        queryFn: getRecentActivities,
        retry: 2,
        refetchInterval: 30 * 1000, // Refetch toutes les 30 secondes
        refetchIntervalInBackground: true, // Continue le refetch même quand l'onglet n'est pas actif
        staleTime: 15 * 1000, // Les données sont considérées comme fraîches pendant 15 secondes
        gcTime: 5 * 1000, // Garde les données en cache pendant 5 minutes
        refetchOnWindowFocus: true, // Refetch quand l'utilisateur revient sur l'onglet
        refetchOnMount: true, // Refetch quand le composant est monté
    });

    // Fonction pour invalider le cache des activités récentes
    const invalidateActivities = () => {
        queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
    };

    // Fonction pour optimistically ajouter une nouvelle activité
    const addActivityOptimistically = (newActivity: UserActivity) => {
        queryClient.setQueryData(['recent-activities'], (oldData: UserActivity[] | undefined) => {
            if (!oldData) return [newActivity];
            return [newActivity, ...oldData.slice(0, 9)]; // Garder seulement les 10 plus récentes
        });
    };

    return {
        activities,
        isLoading,
        error,
        refetch,
        isFetching,
        invalidateActivities,
        addActivityOptimistically,
        // Calculer le nombre d'activités récentes (moins de 1 heure)
        recentCount: activities.filter(activity => {
            const activityDate = new Date(activity.createdAt);
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            return activityDate > oneHourAgo;
        }).length
    };
} 