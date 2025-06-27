"use client";

import Header from "@/components/factureId/header";
import { useInvoice } from "@/hooks/useInvoice";
import { Loader2 } from "lucide-react";

interface InvoiceHeaderProps {
    invoiceNumber: string;
}

export default function InvoiceHeader({ invoiceNumber }: InvoiceHeaderProps) {
    const { invoice, isLoading } = useInvoice(invoiceNumber);

    if (isLoading || !invoice) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    return <Header invoice={invoice} />;
} 