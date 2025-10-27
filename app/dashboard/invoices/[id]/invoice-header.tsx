"use client";

import Header from "@/components/factureId/header";
import { useInvoice } from "@/hooks/useInvoice";
import { Loader2 } from "lucide-react";

interface InvoiceHeaderProps {
    invoice: any;
}

export default function InvoiceHeader({ invoice }: InvoiceHeaderProps) {

    if (!invoice) {
        return (
            <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    return <Header invoice={invoice} />;
} 