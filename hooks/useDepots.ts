import { useQuery } from '@tanstack/react-query';
import { getActiveDepots } from '@/actions/depot';

export function useDepots() {
    const {
        data: depots = [],
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['depots'],
        queryFn: () => getActiveDepots(),
        staleTime: 5 * 60 * 1000, // Les données sont considérées comme fraîches pendant 5 minutes
        gcTime: 15 * 60 * 1000, // Garde les données en cache pendant 15 minutes
        retry: 2,
        refetchOnWindowFocus: false, // Les dépôts changent rarement
        refetchOnReconnect: true,
    });

    return {
        depots,
        isLoading,
        error,
        refetch
    };
} 