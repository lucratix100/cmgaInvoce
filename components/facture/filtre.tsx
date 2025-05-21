'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Building, Calendar, DollarSign, Filter, Search, Menu, X } from "lucide-react"
import { useState, useEffect } from "react"
import { formatDate, getDefaultDates } from "@/lib/date-utils"
import { InvoiceStatus } from "@/types/enums"
import { getDepots } from "@/actions/depot"
import { depot, user } from "@/types"
import { getCurrentUser } from "@/actions/user"
import { useRouter, useSearchParams } from "next/navigation"

interface FilterProps {
    onStatusChange: (status: string) => void;
    onSearch: (search: string) => void;
    currentStatus: string;
    searchValue: string;
    onDateChange: (startDate: string, endDate?: string) => void;
    onPaymentStatusChange?: (status: string) => void;
}

interface FilterState {
    startDate: string
    endDate: string
    status: string
    searchInvoice: string
}


export default function Filtre({
    onStatusChange,
    onSearch,
    currentStatus,
    searchValue,
    onDateChange,
    onPaymentStatusChange
}: FilterProps) {

    const router = useRouter()
    const searchParams = useSearchParams()
    const statusOptions = [
        { value: "tous", label: "TOUS" },
        { value: InvoiceStatus.EN_ATTENTE, label: "EN ATTENTE DE LIVRAISON" },
        { value: InvoiceStatus.EN_COURS, label: "EN COURS DE LIVRAISON" },
        { value: InvoiceStatus.LIVREE, label: "LIVREE" }
    ]

    const [depot, setDepot] = useState("")
    const [depots, setDepots] = useState<depot[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const today = new Date().toISOString().split('T')[0]
    const [filters, setFilters] = useState({
        startDate: searchParams.get('startDate') || today,
        endDate: searchParams.get('endDate') || undefined,
        status: searchParams.get('status') || "en cours de livraison",
        searchInvoice: searchParams.get('search') || "",
        paymentStatus: searchParams.get('paymentStatus') || "tous"
    })
    const [searchField, setSearchField] = useState("invoiceNumber")
    const [user, setUser] = useState<any>(null)
    const [statutPaiement, setStatutPaiement] = useState(filters.paymentStatus)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    useEffect(() => {
        const loadUser = async () => {
            const data = await getCurrentUser()
            setUser(data)
        }
        loadUser()
    }, [])
    useEffect(() => {
        let mounted = true

        async function loadDepots() {
            try {
                setLoading(true)
                const data = await getDepots()
                if (mounted && data.length > 0) {
                    setDepots(data)
                    setDepot(data[0].id.toString())
                }
            } catch (err) {
                if (mounted) {
                    console.error('Erreur dépôts:', err)
                    setError("Erreur lors du chargement des dépôts")
                }
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }
        loadDepots()
        return () => {
            mounted = false
        }
    }, [])

    useEffect(() => {
        // Initialiser les filtres depuis l'URL
        const params = new URLSearchParams(searchParams.toString())
        
        // Mettre à jour les dates
        const startDate = params.get('startDate') || today
        const endDate = params.get('endDate') || undefined
        onDateChange(startDate, endDate || '')

        // Mettre à jour le statut
        const status = params.get('status') || "en cours de livraison"
        onStatusChange(status)

        // Mettre à jour la recherche
        const search = params.get('search') || ""
        onSearch(search)

        // Mettre à jour le statut de paiement
        const paymentStatus = params.get('paymentStatus') || "tous"
        setStatutPaiement(paymentStatus)
        if (onPaymentStatusChange) {
            onPaymentStatusChange(paymentStatus)
        }
    }, [searchParams])

    const updateURL = (newFilters: typeof filters) => {
        const params = new URLSearchParams(searchParams.toString())

        // Mettre à jour les paramètres
        params.set('startDate', newFilters.startDate)
        if (newFilters.endDate) {
            params.set('endDate', newFilters.endDate)
        } else {
            params.delete('endDate')
        }
        if (newFilters.status && newFilters.status !== "tous") {
            params.set('status', newFilters.status)
        } else {
            params.delete('status')
        }
        if (newFilters.searchInvoice) {
            params.set('search', newFilters.searchInvoice)
        } else {
            params.delete('search')
        }
        if (newFilters.paymentStatus && newFilters.paymentStatus !== "tous") {
            params.set('paymentStatus', newFilters.paymentStatus)
        } else {
            params.delete('paymentStatus')
        }

        // Mettre à jour l'URL sans recharger la page
        router.replace(`?${params.toString()}`, { scroll: false })
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        onSearch(value)
        const newFilters = {
            ...filters,
            searchInvoice: value
        }
        setFilters(newFilters)
        updateURL(newFilters)
    }

    const handleDateChange = (type: 'start' | 'end', value: string) => {
        const newFilters = {
            ...filters,
            [type === 'start' ? 'startDate' : 'endDate']: value
        }
        setFilters(newFilters)
        updateURL(newFilters)
        onDateChange(newFilters.startDate, newFilters.endDate)
    }

    const handleStatusChange = (value: string) => {
        const newFilters = {
            ...filters,
            status: value
        }
        setFilters(newFilters)
        updateURL(newFilters)
        onStatusChange(value)
    }

    const handlePaymentStatusChange = (value: string) => {
        const newFilters = {
            ...filters,
            paymentStatus: value
        }
        setFilters(newFilters)
        setStatutPaiement(value)
        if (onPaymentStatusChange) {
            onPaymentStatusChange(value)
        }
        updateURL(newFilters)
    }

    const paiementOptions = [
        { value: "tous", label: "TOUS" },
        { value: "payé", label: "PAYÉ" },
        { value: "non payé", label: "NON PAYÉ" },
        { value: "paiement partiel", label: "PAIEMENT PARTIEL" }
    ]

    return (
        <>
            {/* Bouton du menu burger pour mobile */}
            <div className="md:hidden flex justify-between items-center p-4 bg-white border-b">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="md:hidden"
                >
                    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
                <div className="flex-1 px-4">
                    <Input
                        type="text"
                        value={searchValue}
                        onChange={handleSearchChange}
                        placeholder="Rechercher..."
                        className="w-full"
                    />
                </div>
            </div>

            {/* Menu mobile */}
            <div className={`md:hidden fixed inset-0 bg-white z-50 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Filtres</h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>

                    {/* Filtres pour mobile */}
                    <div className="space-y-4">
                        {/* Sélection du dépôt (admin) */}
                        {user?.role === "ADMIN" && (
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-primary-700">
                                    <Building className="h-4 w-4" />
                                    Dépôt
                                </Label>
                                <Select value={depot} onValueChange={setDepot} disabled={loading}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder={loading ? "Chargement..." : "Sélectionner un dépôt"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {error ? (
                                            <SelectItem value="error" disabled className="text-red-500">
                                                {error}
                                            </SelectItem>
                                        ) : (
                                            depots.map((depot) => (
                                                <SelectItem key={depot.id} value={depot.id.toString()}>
                                                    {depot.name}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Dates */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-primary-700">
                                <Calendar className="h-4 w-4" />
                                Période
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => handleDateChange('start', e.target.value)}
                                    className="w-full"
                                />
                                <Input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => handleDateChange('end', e.target.value)}
                                    className="w-full"
                                />
                            </div>
                        </div>
                        {/* État */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-primary-700">
                                <Filter className="h-4 w-4" />
                                État
                            </Label>
                            <Select value={currentStatus} onValueChange={handleStatusChange}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Sélectionner un état" />
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* État de paiement */}
                        {user?.role === "RECOUVREMENT" && (
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-primary-700">
                                    <DollarSign className="h-4 w-4" />
                                    État paiement
                                </Label>
                                <Select value={statutPaiement} onValueChange={handlePaymentStatusChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Sélectionner un état" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {paiementOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                                className="hover:bg-primary-50 focus:bg-primary-50 cursor-pointer"
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Version desktop */}
            <Card className="hidden md:block border-none shadow-md overflow-hidden bg-white">
                <CardHeader className="bg-primary-50 pb-1">
                    <CardTitle className="flex items-center gap-2 text-primary-700">
                        <div className="flex items-center gap-2 justify-between w-full">
                            <div className="flex items-center gap-2">
                                <Filter className="h-5 w-5" />
                                <span className="text-md font-medium">Filtres</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {user?.role === "ADMIN" && (
                                    <Select
                                        value={depot}
                                        onValueChange={setDepot}
                                        disabled={loading}
                                    >
                                        <SelectTrigger className="w-[180px] border-dashed bg-white hover:bg-primary-100 transition-colors">
                                            <Building className="h-4 w-4 mr-2 text-primary" />
                                            <SelectValue
                                                placeholder={
                                                    loading ? "Chargement..." : "Sélectionner un dépôt"
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white">
                                            {error ? (
                                                <SelectItem
                                                    value="error"
                                                    disabled
                                                    className="text-red-500"
                                                >
                                                    {error}
                                                </SelectItem>
                                            ) : (
                                                depots.map((depot) => (
                                                    <SelectItem
                                                        key={depot.id}
                                                        value={depot.id.toString()}
                                                        className="hover:bg-primary-50 focus:bg-primary-50 cursor-pointer"
                                                    >
                                                        {depot.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="flex justify-between items-end gap-4">
                        {/* Section Gauche: Dates et État */}
                        <div className="flex items-end gap-4">
                            {/* Section Date */}
                            <div className="flex gap-4">
                                <div className="space-y-2 w-40">
                                    <Label htmlFor="start-date" className="flex items-center gap-2 text-primary-700">
                                        <Calendar className="h-4 w-4" />
                                        Date
                                    </Label>
                                    <Input
                                        type="date"
                                        value={filters.startDate}
                                        onChange={(e) => handleDateChange('start', e.target.value)}
                                        className="border-primary-200 focus:border-primary-500 w-full"
                                        required
                                    />
                                </div>
                                <div className="space-y-2 w-40">
                                    <Label htmlFor="end-date" className="flex items-center gap-2 text-primary-700">
                                        <Calendar className="h-4 w-4" />
                                        Date fin (optionnel)
                                    </Label>
                                    <Input
                                        type="date"
                                        value={filters.endDate}
                                        onChange={(e) => handleDateChange('end', e.target.value)}
                                        className="border-primary-200 focus:border-primary-500 w-full"
                                    />
                                </div>
                            </div>

                            {/* Section État */}
                            <div className="space-y-2 min-w-[200px]">
                                <Label className="flex items-center gap-2 text-primary-700">
                                    <Filter className="h-4 w-4" />
                                    État
                                </Label>
                                <Select value={currentStatus} onValueChange={handleStatusChange}>
                                    <SelectTrigger className="transition-all hover:border-primary-300 focus:border-primary focus:ring-primary">
                                        <SelectValue placeholder="Sélectionner un état" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        {statusOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                                className="hover:bg-primary-50 focus:bg-primary-50 cursor-pointer"
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {user?.role === "RECOUVREMENT" && (
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-primary-700">
                                        <DollarSign className="h-4 w-4" />
                                        État paiement
                                    </Label>
                                    <Select value={statutPaiement} onValueChange={handlePaymentStatusChange}>
                                        <SelectTrigger className="transition-all hover:border-primary-300 focus:border-primary focus:ring-primary">
                                            <SelectValue placeholder="Sélectionner un état" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white">
                                            {paiementOptions.map((option) => (
                                                <SelectItem
                                                    key={option.value}
                                                    value={option.value}
                                                    className="hover:bg-primary-50 focus:bg-primary-50 cursor-pointer"
                                                >
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* Section Droite: Recherche */}
                        <div className="space-y-2 w-64">
                            <Label className="flex items-center gap-2 text-primary-700">
                                <Search className="h-4 w-4" />
                                Rechercher
                            </Label>
                            <Input
                                type="text"
                                value={searchValue}
                                onChange={handleSearchChange}
                                placeholder="Rechercher..."
                                className="w-full"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    )
}