'use client'

import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useEffect } from "react"
import { useInvoiceStore } from "@/store/invoiceStore"
import { useRouter, useSearchParams } from 'next/navigation'
import Filtre from "./filtre"

interface InvoiceTableProps {
    initialData: {
        user: any;
        invoices: any[];
    }
}

export default function InvoiceTable({ initialData }: InvoiceTableProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const {
        filteredInvoices,
        loading,
        status,
        search,
        user,
        setStatus,
        setSearch,
        setDateRange,
        setInvoices,
        setUser
    } = useInvoiceStore()

    const handleDateChange = (startDate: string, endDate: string) => {
        // Mettre à jour l'URL
        const params = new URLSearchParams(searchParams.toString())
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)
        router.push(`?${params.toString()}`)
        setDateRange(startDate, endDate)
    }

    useEffect(() => {
        if (initialData) {
            setUser(initialData.user)
            setInvoices(initialData.invoices)
        }
    }, [initialData, setUser, setInvoices])

    // Afficher uniquement le loader initial
    if (!initialData) {
        return (
            <Table >
                <TableHeader>
                    <TableRow className="bg-primary-50/50">
                        <TableHead className="font-semibold text-primary-900">N° Facture</TableHead>
                        <TableHead className="font-semibold text-primary-900">N° Compte</TableHead>
                        <TableHead className="font-semibold text-primary-900">Date</TableHead>
                        <TableHead className="font-semibold text-primary-900">Client</TableHead>
                        <TableHead className="font-semibold text-primary-900">Téléphone</TableHead>
                        <TableHead className="font-semibold text-primary-900">État</TableHead>
                        <TableHead className="font-semibold text-primary-900">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                            Chargement initial...
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        )
    }

    const noInvoicesMessage = () => {
        if (searchParams.get('startDate') || searchParams.get('endDate')) {
            const startDate = searchParams.get('startDate')
            const endDate = searchParams.get('endDate')
            return `Aucune facture trouvée ${startDate ? `du ${new Date(startDate).toLocaleDateString('fr-FR')}` : ''} ${endDate ? `au ${new Date(endDate).toLocaleDateString('fr-FR')}` : ''}`
        }
        return "Aucune facture ne correspond à votre recherche"
    }

    return (
        <>
            <Filtre
                onStatusChange={setStatus}
                onSearch={setSearch}
                onDateChange={handleDateChange}
                currentStatus={status}
                searchValue={search}
            />
            <div className="h-[calc(80vh-220px)] overflow-auto">
                <Table>
                    <TableHeader className="sticky top-0 z-10">
                        <TableRow className="bg-primary-50/50">
                            <TableHead className="font-semibold text-primary-900">N° Facture</TableHead>
                            <TableHead className="font-semibold text-primary-900">N° Compte</TableHead>
                            <TableHead className="font-semibold text-primary-900">Date</TableHead>
                            <TableHead className="font-semibold text-primary-900">Client</TableHead>
                            <TableHead className="font-semibold text-primary-900">Téléphone</TableHead>
                            <TableHead className="font-semibold text-primary-900">État</TableHead>
                            <TableHead className="font-semibold text-primary-900">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-4">
                                    Mise à jour des données...
                                </TableCell>
                            </TableRow>
                        ) : filteredInvoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                                    {noInvoicesMessage()}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredInvoices.map((invoice) => (
                                <TableRow key={invoice.id} className="hover:bg-primary-50/30 transition-colors">
                                    <TableCell className="font-medium">
                                        <Link href={`/factures/${invoice.invoiceNumber}`} className="hover:text-primary transition-colors">
                                            {invoice.invoiceNumber}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{invoice.accountNumber}</TableCell>
                                    <TableCell>{new Date(invoice.date).toLocaleDateString('fr-FR')}</TableCell>
                                    <TableCell>{invoice.customer?.name || <span className="text-red-500">Non renseigné</span>}</TableCell>
                                    <TableCell>{invoice.customer?.phone || <span className="text-red-500">Non renseigné</span>}</TableCell>
                                    <TableCell>
                                        <StatusBadge status={invoice.status} />
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            asChild
                                            className="hover:bg-primary-100 hover:text-primary-700 transition-colors"
                                        >
                                            {user?.role === "ADMIN" ? (
                                                <Link href={`/dashboard/invoices/${invoice.invoiceNumber}`} className="flex items-center gap-2">
                                                    <Eye className="h-4 w-4" />
                                                    Détails
                                                </Link>
                                            ) : (
                                                <Link href={`/factures/${invoice.invoiceNumber}`} className="flex items-center gap-2">
                                                    <Eye className="h-4 w-4" />
                                                    Détails
                                                </Link>
                                            )}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    )
}

function StatusBadge({ status }: { status: string }) {
    const getStatusStyles = (status: string) => {
        switch (status) {
            case "livrée":
                return "bg-green-100 text-green-700 hover:bg-green-200 border-green-200"
            case "en attente de livraison":
                return "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200"
            case "en cours de livraison":
                return "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200"
            default:
                return "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
        }
    }

    return (
        <Badge variant="outline" className={`${getStatusStyles(status)} font-medium transition-colors`}>
            {status.toUpperCase()}
        </Badge>
    )
}