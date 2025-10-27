import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook pour invalider automatiquement le cache des activités récentes
 * après certaines actions utilisateur
 */
export function useActivityInvalidation() {
    const queryClient = useQueryClient();

    // Invalider les activités récentes
    const invalidateRecentActivities = () => {
        queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
    };

    // Invalider les activités et autres données liées
    const invalidateAllActivityData = () => {
        queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
        // Vous pouvez ajouter d'autres invalidations ici si nécessaire
        // queryClient.invalidateQueries({ queryKey: ['other-activity-data'] });
    };

    // Fonction pour invalider après une action spécifique
    const invalidateAfterAction = (actionType: string) => {
        console.log(`Invalidation des activités après action: ${actionType}`);
        invalidateRecentActivities();
    };

    return {
        invalidateRecentActivities,
        invalidateAllActivityData,
        invalidateAfterAction
    };
} 