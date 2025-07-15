import { useQuery } from '@tanstack/react-query';
import { getInvoicesWithStatistics } from '@/actions/invoice';
import { useMemo } from 'react';

interface UseInvoicesWithStatisticsParams {
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
    depot?: string;
}

export function useInvoicesWithStatistics(params: UseInvoicesWithStatisticsParams = {}) {
    // Utiliser useMemo pour éviter les re-créations inutiles de la queryKey
    const queryKey = useMemo(() => {
        const keyParams = {
            startDate: params.startDate || undefined,
            endDate: params.endDate || undefined,
            status: params.status || undefined,
            search: params.search || undefined,
            depot: params.depot || undefined,
        };

        // Filtrer les paramètres undefined pour éviter les changements inutiles
        const filteredParams = Object.fromEntries(
            Object.entries(keyParams).filter(([_, value]) => value !== undefined)
        );

        return ['invoices-with-statistics', filteredParams];
    }, [params.startDate, params.endDate, params.status, params.search, params.depot]);

    const {
        data = { invoices: [], statistics: null },
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey,
        queryFn: () => getInvoicesWithStatistics(params),
        refetchInterval: 3 * 60 * 1000, // Refetch toutes les 3 minutes
        refetchIntervalInBackground: true, // Continue le refetch même quand l'onglet n'est pas actif
        staleTime: 2 * 60 * 1000, // Les données sont considérées comme fraîches pendant 2 minutes
        gcTime: 10 * 60 * 1000, // Garde les données en cache pendant 10 minutes
        retry: 2,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });

    return {
        invoices: data.invoices || [],
        statistics: data.statistics,
        isLoading,
        error,
        refetch
    };
} 