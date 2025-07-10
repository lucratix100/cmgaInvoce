import { useQuery } from '@tanstack/react-query';
import { getInvoices } from '@/actions/invoice';

interface UseInvoicesParams {
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
    depot?: string;
}

export function useInvoices(params: UseInvoicesParams = {}) {
    const {
        data: invoices = [],
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['invoices', params],
        queryFn: () => getInvoices(params),
        refetchInterval: 3 * 60 * 1000, // Refetch toutes les 3 minutes
        refetchIntervalInBackground: true, // Continue le refetch même quand l'onglet n'est pas actif
        staleTime: 2 * 60 * 1000, // Les données sont considérées comme fraîches pendant 2 minutes
        gcTime: 10 * 60 * 1000, // Garde les données en cache pendant 10 minutes
        retry: 2,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });

    return {
        invoices,
        isLoading,
        error,
        refetch
    };
} 