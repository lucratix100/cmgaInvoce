import { useQuery } from '@tanstack/react-query';
import { getInvoiceByNumber } from '@/actions/invoice';

export function useInvoice(invoiceNumber: string) {
    const {
        data: invoice,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['invoice', invoiceNumber],
        queryFn: () => getInvoiceByNumber(invoiceNumber),
        enabled: !!invoiceNumber,
        staleTime: 1 * 60 * 1000, // Les données sont considérées comme fraîches pendant 1 minute
        gcTime: 5 * 60 * 1000, // Garde les données en cache pendant 5 minutes
        retry: 2,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });

    return {
        invoice: invoice?.invoice,
        isLoading,
        error,
        refetch
    };
} 