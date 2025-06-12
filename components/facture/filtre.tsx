'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Building, Calendar, DollarSign, Filter, Search, Menu, X } from "lucide-react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { InvoiceStatus } from "@/types/enums"
import { depot, user } from "@/types"
import { useRouter, useSearchParams } from "next/navigation"
import { Role } from "@/types/roles"

interface FilterProps {
    onStatusChange: (status: string) => void;
    onSearch: (search: string) => void;
    currentStatus: string;
    searchValue: string;
    onDateChange: (startDate: string, endDate?: string) => void;
    onPaymentStatusChange?: (status: string) => void;
    onDepotChange?: (depotId: string) => void;
    user: user;
    depots: depot[];
}

interface FilterState {
    startDate: string;
    endDate?: string;
    status: string;
    searchInvoice: string;
    paymentStatus: string;
    depot: string;
    searchField: string;
}

export default function Filtre({
    onStatusChange,
    onSearch,
    currentStatus,
    searchValue,
    onDateChange,
    onPaymentStatusChange,
    onDepotChange,
    user,
    depots
}: FilterProps) {
    console.log(depots, "depots")
    console.log(user, 'user')
    const router = useRouter()
    const searchParams = useSearchParams()
    const today = new Date().toISOString().split('T')[0]

    const [state, setState] = useState<FilterState>(() => {
        const params = new URLSearchParams(searchParams.toString())
        return {
            startDate: params.get('startDate') || today,
            endDate: params.get('endDate') || '',
            status: params.get('status') || 'tous',
            searchInvoice: params.get('search') || "",
            paymentStatus: params.get('paymentStatus') || "tous",
            depot: params.get('depot') || "tous",
            searchField: "invoiceNumber"
        }
    })

    const [depotsData, setDepotsData] = useState<depot[]>(depots)
    // const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    // Gestion des erreurs améliorée
    const handleError = (error: unknown, context: string) => {
        console.error(`Erreur dans ${context}:`, error)
        setError(`Une erreur est survenue lors de ${context}. Veuillez réessayer.`)
    }

    const updateURL = useCallback((newState: Partial<FilterState>) => {
        const params = new URLSearchParams(searchParams.toString())

        Object.entries(newState).forEach(([key, value]) => {
            if (value) {
                params.set(key, value)
            } else {
                params.delete(key)
            }
        })

        router.replace(`?${params.toString()}`, { scroll: false })
    }, [searchParams, router])

    const handleStateChange = useCallback((updates: Partial<FilterState>) => {
        const newState = { ...state, ...updates }
        setState(newState)

        // Mettre à jour l'URL avec tous les paramètres
        const params = new URLSearchParams(searchParams.toString())
        Object.entries(newState).forEach(([key, value]) => {
            if (value && value !== 'tous') {
                params.set(key, value)
            } else {
                params.delete(key)
            }
        })
        router.replace(`?${params.toString()}`, { scroll: false })

        // Appeler les callbacks appropriés
        if (updates.status) onStatusChange(updates.status)
        if (updates.searchInvoice) onSearch(updates.searchInvoice)
        if (updates.startDate || updates.endDate) {
            onDateChange(updates.startDate || state.startDate, updates.endDate)
        }
        if (updates.paymentStatus && onPaymentStatusChange) {
            onPaymentStatusChange(updates.paymentStatus)
        }
        if (updates.depot && onDepotChange) {
            onDepotChange(updates.depot)
        }
    }, [state, onStatusChange, onSearch, onDateChange, onPaymentStatusChange, onDepotChange, router, searchParams])

    const statusOptions = useMemo(() => [
        { value: "tous", label: "TOUS" },
        { value: "en attente de livraison", label: "EN ATTENTE DE LIVRAISON" },
        { value: "en cours de livraison", label: "EN COURS DE LIVRAISON" },
        { value: "livrée", label: "LIVREE" }
    ], [])

    const paiementOptions = useMemo(() => [
        { value: "tous", label: "TOUS" },
        { value: "payé", label: "PAYÉ" },
        { value: "non payé", label: "NON PAYÉ" },
        { value: "paiement partiel", label: "PAIEMENT PARTIEL" }
    ], [])

    return (
        <>
            {/* Bouton du menu burger pour mobile */}
            <div className="md:hidden flex justify-between items-center p-4 bg-white border-b">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="md:hidden"
                    aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
                    aria-expanded={isMobileMenuOpen}
                    aria-controls="mobile-filter-menu"
                >
                    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
                <div className="flex-1 px-4">
                    <Input
                        type="text"
                        value={state.searchInvoice}
                        onChange={(e) => handleStateChange({ searchInvoice: e.target.value })}
                        placeholder="Rechercher une facture..."
                        className="w-full"
                        aria-label="Rechercher une facture"
                        role="searchbox"
                    />
                </div>
            </div>

            {/* Menu mobile */}
            <div
                id="mobile-filter-menu"
                className={`md:hidden fixed inset-0 bg-white z-50 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
                role="dialog"
                aria-modal="true"
                aria-label="Menu des filtres"
            >
                <div className="p-4 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Filtres</h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsMobileMenuOpen(false)}
                            aria-label="Fermer le menu des filtres"
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>

                    {/* Filtres pour mobile */}
                    <div className="space-y-4" role="group" aria-label="Options de filtrage">
                        {/* Sélection du dépôt (admin) */}
                        {(user?.role === Role.ADMIN || user?.role === Role.RECOUVREMENT) && (
                            <div className="space-y-2" role="group" aria-labelledby="depot-label">
                                <Label id="depot-label" className="flex items-center gap-2 text-primary-700">
                                    <Building className="h-4 w-4" />
                                    Dépôt
                                </Label>
                                <Select
                                    value={state.depot}
                                    onValueChange={(value) => handleStateChange({ depot: value })}
                                    aria-label="Sélectionner un dépôt"
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Sélectionner un dépôt" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {error ? (
                                            <SelectItem value="error" disabled className="text-red-500">
                                                {error}
                                            </SelectItem>
                                        ) : (
                                            <>
                                                <SelectItem value="tous" className="hover:bg-primary-50 focus:bg-primary-50 cursor-pointer">
                                                    TOUS LES DÉPÔTS
                                                </SelectItem>
                                                {depots?.map((depot) => (
                                                    <SelectItem
                                                        key={depot.id}
                                                        value={depot.id.toString()}
                                                        className="hover:bg-primary-50 focus:bg-primary-50 cursor-pointer"
                                                    >
                                                        {depot.name}
                                                    </SelectItem>
                                                ))}
                                            </>
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
                                    value={state.startDate}
                                    onChange={(e) => {
                                        const newDate = e.target.value
                                        handleStateChange({ startDate: newDate })
                                    }}
                                    className="w-full"
                                    required
                                />
                                <Input
                                    type="date"
                                    value={state.endDate || ''}
                                    onChange={(e) => {
                                        const newDate = e.target.value
                                        handleStateChange({ endDate: newDate })
                                    }}
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
                            <Select value={state.status} onValueChange={(value) => handleStateChange({ status: value })}>
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
                        {(user?.role === Role.RECOUVREMENT || user?.role === Role.ADMIN) && (
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-primary-700">
                                    <DollarSign className="h-4 w-4" />
                                    État paiement
                                </Label>
                                <Select value={state.paymentStatus} onValueChange={(value) => handleStateChange({ paymentStatus: value })}>
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
                            {/* <div className="flex items-center gap-2">
                                <Filter className="h-5 w-5" />
                                <span className="text-md font-medium">Filtres</span>
                            </div> */}
                            <div className="flex items-center gap-2">
                                {/* {currentUser?.role === "ADMIN" && (
                                    <Select
                                        value={state.depot}
                                        onValueChange={(value) => handleStateChange({ depot: value })}
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
                                )} */}
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
                                        value={state.startDate}
                                        onChange={(e) => {
                                            const newDate = e.target.value
                                            handleStateChange({ startDate: newDate })
                                        }}
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
                                        value={state.endDate || ''}
                                        onChange={(e) => {
                                            const newDate = e.target.value
                                            handleStateChange({ endDate: newDate })
                                        }}
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
                                <Select value={state.status} onValueChange={(value) => handleStateChange({ status: value })}>
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
                            {(user?.role === Role.RECOUVREMENT || user?.role === Role.ADMIN) && (
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-primary-700">
                                        <DollarSign className="h-4 w-4" />
                                        État paiement
                                    </Label>
                                    <Select value={state.paymentStatus} onValueChange={(value) => handleStateChange({ paymentStatus: value })}>
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
                            {(user?.role === Role.RECOUVREMENT || user?.role === Role.ADMIN) && (
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-primary-700">
                                        <Building className="h-4 w-4 mr-2 text-primary" />
                                        Dépôt
                                    </Label>

                                    <Select
                                        value={state.depot}
                                        onValueChange={(value) => handleStateChange({ depot: value })}

                                    >
                                        <SelectTrigger className="transition-all hover:border-primary-300 focus:border-primary focus:ring-primary">
                                            <SelectValue
                                                placeholder={
                                                    "Sélectionner un dépôt"
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
                                                <>
                                                    <SelectItem value="tous" className="hover:bg-primary-50 focus:bg-primary-50 cursor-pointer">
                                                        TOUS LES DÉPÔTS
                                                    </SelectItem>
                                                    {depotsData?.map((depot) => (
                                                        <SelectItem
                                                            key={depot.id}
                                                            value={depot.id.toString()}
                                                            className="hover:bg-primary-50 focus:bg-primary-50 cursor-pointer"
                                                        >
                                                            {depot.name}
                                                        </SelectItem>
                                                    ))}
                                                </>
                                            )}
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
                                value={state.searchInvoice}
                                onChange={(e) => handleStateChange({ searchInvoice: e.target.value })}
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