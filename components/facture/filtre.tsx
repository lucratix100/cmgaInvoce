'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Building, Calendar, DollarSign, Search, Menu, X, Truck } from "lucide-react"
import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { depot, user } from "@/types"
import { useRouter, useSearchParams } from "next/navigation"
import { Role } from "@/types/roles"
import ScanUnified from "@/components/scan-unified"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { DatePicker } from "@/components/ui/date-picker"
import { format, parse } from "date-fns"

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

// Schéma de validation avec Zod
const filterSchema = z.object({
    startDate: z.string(),
    endDate: z.string().optional(),
    status: z.string(),
    search: z.string(),
    paymentStatus: z.string(),
    depot: z.string(),
    searchField: z.string()
})

type FilterFormData = z.infer<typeof filterSchema>

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

    const router = useRouter()
    const searchParams = useSearchParams()
    const today = new Date().toISOString().split('T')[0]
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const isInitializedRef = useRef(false)
    const previousValuesRef = useRef<Partial<FilterFormData>>({})

    // Initialisation des valeurs par défaut depuis les paramètres URL
    const defaultValues = useMemo(() => {
        const params = new URLSearchParams(searchParams.toString())
        return {
            startDate: params.get('startDate') || today,
            endDate: params.get('endDate') || '',
            status: params.get('status') || 'tous',
            search: params.get('search') || "",
            paymentStatus: params.get('paymentStatus') || "tous",
            depot: params.get('depot') || "tous",
            searchField: "invoiceNumber"
        }
    }, [searchParams, today])

    // Configuration de react-hook-form
    const {
        control,
        watch,
        setValue,
        reset,
        formState: { isDirty }
    } = useForm<FilterFormData>({
        resolver: zodResolver(filterSchema),
        defaultValues,
        mode: "onBlur"
    })

    // Surveiller les changements de valeurs
    const watchedValues = watch()

    // Fonction pour mettre à jour l'URL
    const updateURL = useCallback((newParams: Partial<FilterFormData>) => {
        const params = new URLSearchParams(searchParams.toString())

        // Traiter chaque paramètre
        if (newParams.status) {
            params.set('status', newParams.status)
        } else {
            params.delete('status')
        }

        if (newParams.startDate) {
            params.set('startDate', newParams.startDate)
        } else {
            params.delete('startDate')
        }

        if (newParams.endDate) {
            params.set('endDate', newParams.endDate)
        } else {
            params.delete('endDate')
        }

        if (newParams.paymentStatus) {
            params.set('paymentStatus', newParams.paymentStatus)
        } else {
            params.delete('paymentStatus')
        }

        if (newParams.depot) {
            params.set('depot', newParams.depot)
        } else {
            params.delete('depot')
        }

        if (newParams.search && newParams.search.trim() !== '') {
            params.set('search', newParams.search.trim())
        } else {
            params.delete('search')
        }

        router.replace(`?${params.toString()}`, { scroll: false })
    }, [searchParams, router])

    // Effet pour initialiser le formulaire avec les valeurs de l'URL
    useEffect(() => {
        if (!isInitializedRef.current) {
            reset(defaultValues)
            previousValuesRef.current = defaultValues
            isInitializedRef.current = true
        }
    }, [defaultValues, reset])

    // Effet pour synchroniser avec les changements d'URL (rafraîchissement de page)
    useEffect(() => {
        if (!isInitializedRef.current) {
            return
        }

        const params = new URLSearchParams(searchParams.toString())
        const urlValues = {
            startDate: params.get('startDate') || today,
            endDate: params.get('endDate') || '',
            status: params.get('status') || 'tous',
            search: params.get('search') || "",
            paymentStatus: params.get('paymentStatus') || "tous",
            depot: params.get('depot') || "tous",
            searchField: "invoiceNumber"
        }

        // Vérifier si les valeurs de l'URL sont différentes des valeurs précédentes
        const previousValues = previousValuesRef.current

        if (JSON.stringify(urlValues) !== JSON.stringify(previousValues)) {
            reset(urlValues)
            previousValuesRef.current = urlValues
        }
    }, [searchParams, today, reset])

    // Effet pour surveiller les changements des filtres (sauf la recherche)
    useEffect(() => {
        if (!isInitializedRef.current) {
            return
        }

        const currentValues = {
            status: watchedValues.status,
            startDate: watchedValues.startDate,
            endDate: watchedValues.endDate,
            paymentStatus: watchedValues.paymentStatus,
            depot: watchedValues.depot
        }

        const previousValues = {
            status: previousValuesRef.current.status,
            startDate: previousValuesRef.current.startDate,
            endDate: previousValuesRef.current.endDate,
            paymentStatus: previousValuesRef.current.paymentStatus,
            depot: previousValuesRef.current.depot
        }

        // Vérifier si les valeurs ont réellement changé
        const hasChanged = JSON.stringify(currentValues) !== JSON.stringify(previousValues)

        if (hasChanged) {
            updateURL(currentValues)
            previousValuesRef.current = { ...previousValuesRef.current, ...currentValues }
        }
    }, [watchedValues.status, watchedValues.startDate, watchedValues.endDate, watchedValues.paymentStatus, watchedValues.depot, updateURL])

    // Fonction pour déclencher la recherche manuellement
    const handleSearch = useCallback(() => {
        if (!isInitializedRef.current) {
            return
        }

        const currentSearch = watchedValues.search?.trim()
        const previousSearch = previousValuesRef.current.search

        if (currentSearch !== previousSearch) {
            // Préserver tous les paramètres existants et seulement mettre à jour la recherche
            const params = new URLSearchParams(searchParams.toString())
            if (currentSearch && currentSearch !== '') {
                params.set('search', currentSearch)
            } else {
                params.delete('search')
            }
            router.replace(`?${params.toString()}`, { scroll: false })
            previousValuesRef.current.search = currentSearch
            router.refresh()
        }
    }, [watchedValues.search, searchParams, router])

    // Fonction pour gérer la touche Entrée
    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch()
        }
    }, [handleSearch])

    // Fonction pour réinitialiser le champ de recherche
    const handleClearSearch = useCallback(() => {
        setValue('search', '', { shouldDirty: true, shouldTouch: true })
        // Préserver tous les paramètres existants et seulement effacer la recherche
        const params = new URLSearchParams(searchParams.toString())
        params.delete('search')
        router.replace(`?${params.toString()}`, { scroll: false })
        previousValuesRef.current.search = ''
        router.refresh()
    }, [setValue, searchParams, router])

    const statusOptions = useMemo(() => [
        { value: "tous", label: "TOUS", color: "text-gray-700 font-bold", bg: "bg-gray-50" },
        { value: "non réceptionnée", label: "NON RÉCEPTIONNÉE", color: "text-gray-700", bg: "bg-gray-100" },
        { value: "en attente de livraison", label: "EN ATTENTE DE LIVRAISON", color: "text-amber-700", bg: "bg-amber-50" },
        { value: "en cours de livraison", label: "EN COURS DE LIVRAISON", color: "text-blue-700", bg: "bg-blue-50" },
        { value: "livrée", label: "LIVREE", color: "text-green-700", bg: "bg-green-50" },
        { value: "retour", label: "RETOUR", color: "text-red-700", bg: "bg-red-50" },
        { value: "régule", label: "RÉGULE", color: "text-purple-700", bg: "bg-purple-50" }
    ], [])

    const paiementOptions = useMemo(() => [
        { value: "tous", label: "TOUS", color: "text-gray-700 font-bold", bg: "bg-gray-50" },
        { value: "payé", label: "PAYÉ", color: "text-green-700", bg: "bg-green-50" },
        { value: "non payé", label: "NON PAYÉ", color: "text-red-700", bg: "bg-red-50" },
        { value: "paiement partiel", label: "PAIEMENT PARTIEL", color: "text-blue-700", bg: "bg-blue-50" }
    ], [])

    // Fonction pour obtenir la couleur d'un statut
    const getStatusColor = (status: string) => {
        const statusOption = statusOptions.find(option => option.value === status);
        return statusOption?.color || "text-gray-700";
    };

    // Fonction pour obtenir la couleur d'un statut de paiement
    const getPaymentStatusColor = (status: string) => {
        const paymentOption = paiementOptions.find(option => option.value === status);
        return paymentOption?.color || "text-gray-700";
    };

    // Fonction pour obtenir le rôle correspondant au ScanUnified
    const getScanRole = (userRole: string) => {
        switch (userRole) {
            case Role.MAGASINIER:
                return 'magasinier'
            case Role.CHEF_DEPOT:
                return 'chef-depot'
            case Role.CONTROLEUR:
                return 'controller'
            case Role.SUPERVISEUR_MAGASIN:
                return 'superviseur-magasin'
            default:
                return 'magasinier'
        }
    }

    // Fonction pour convertir une date string en Date
    const parseDateString = (dateString: string | undefined): Date | undefined => {
        if (!dateString) return undefined
        try {
            return parse(dateString, 'yyyy-MM-dd', new Date())
        } catch {
            return undefined
        }
    }

    // Fonction pour convertir une Date en string
    const formatDateToString = (date: Date | undefined): string => {
        if (!date) return ''
        return format(date, 'yyyy-MM-dd')
    }

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
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Controller
                                name="search"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        type="text"
                                        placeholder="Rechercher une facture..."
                                        className="pr-8"
                                        aria-label="Rechercher une facture"
                                        role="searchbox"
                                        onKeyPress={handleKeyPress}
                                    />
                                )}
                            />
                            {watchedValues.search && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                                    onClick={handleClearSearch}
                                    aria-label="Effacer la recherche"
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                        <Button
                            onClick={handleSearch}
                            size="sm"
                            className="px-3"
                            aria-label="Lancer la recherche"
                        >
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>
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
                                <Controller
                                    name="depot"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
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
                                    )}
                                />
                            </div>
                        )}

                        {/* Dates */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-primary-700 text-sm">
                                <Calendar className="h-4 w-4 flex-shrink-0" />
                                <span>Période</span>
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-600">Début</Label>
                                    <Controller
                                        name="startDate"
                                        control={control}
                                        render={({ field }) => (
                                            <DatePicker
                                                date={parseDateString(field.value)}
                                                onDateChange={(date) => {
                                                    const dateString = formatDateToString(date)
                                                    field.onChange(dateString)
                                                }}
                                                placeholder="Date début"
                                                className="w-full"
                                            />
                                        )}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-600">Fin (optionnel)</Label>
                                    <Controller
                                        name="endDate"
                                        control={control}
                                        render={({ field }) => (
                                            <DatePicker
                                                date={parseDateString(field.value)}
                                                onDateChange={(date) => {
                                                    const dateString = formatDateToString(date)
                                                    field.onChange(dateString)
                                                }}
                                                placeholder="Date fin"
                                                className="w-full"
                                            />
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                        {/* État */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-primary-700">
                                <Truck className="h-4 w-4" />
                                Etat Livraison
                            </Label>
                            <Controller
                                name="status"
                                control={control}
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Sélectionner un état" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value} className={`${option.bg} hover:bg-primary-50 focus:bg-primary-50 cursor-pointer space-y-2`}>
                                                    <span className={`${option.color} font-medium`}>{option.label}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                        {/* État de paiement */}
                        {(user?.role === Role.RECOUVREMENT || user?.role === Role.ADMIN) && (
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-primary-700">
                                    <DollarSign className="h-4 w-4" />
                                    Etat paiement
                                </Label>
                                <Controller
                                    name="paymentStatus"
                                    control={control}
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Sélectionner un état" />
                                            </SelectTrigger>
                                            <SelectContent className="space-y-2">
                                                {paiementOptions.map((option) => (
                                                    <SelectItem
                                                        key={option.value}
                                                        value={option.value}
                                                        className={`${option.bg} hover:bg-primary-50 focus:bg-primary-50 cursor-pointer`}
                                                    >
                                                        <span className={`${option.color} font-medium`}>{option.label}</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        )}
                        {/* Champ de recherche pour mobile */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-primary-700">
                                <Search className="h-4 w-4" />
                                Rechercher
                            </Label>
                            <div className="flex gap-2">
                                <Controller
                                    name="search"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            type="text"
                                            placeholder="Rechercher une facture..."
                                            className="pr-8"
                                            aria-label="Rechercher une facture"
                                            role="searchbox"
                                            onKeyPress={handleKeyPress}
                                        />
                                    )}
                                />
                                {watchedValues.search && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                                        onClick={handleClearSearch}
                                        aria-label="Effacer la recherche"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                                <Button
                                    onClick={handleSearch}
                                    size="sm"
                                    className="px-3"
                                    aria-label="Lancer la recherche"
                                >
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Version desktop */}
            <Card className="hidden md:block border-none shadow-md overflow-hidden bg-white">
                <CardHeader className="bg-primary-50 pb-1">
                    <CardTitle className="flex items-center gap-2 text-primary-700">
                        <div className="flex items-center gap-2 justify-between w-full">
                            <div className="flex items-center gap-2">
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
                                <div className="space-y-2 w-48">
                                    <Label htmlFor="start-date" className="flex items-center gap-2 text-primary-700 text-sm">
                                        <Calendar className="h-4 w-4 flex-shrink-0" />
                                        <span className="truncate">Date début</span>
                                    </Label>
                                    <Controller
                                        name="startDate"
                                        control={control}
                                        render={({ field }) => (
                                            <DatePicker
                                                date={parseDateString(field.value)}
                                                onDateChange={(date) => {
                                                    const dateString = formatDateToString(date)
                                                    field.onChange(dateString)
                                                }}
                                                placeholder="Date début"
                                                className="w-full"
                                            />
                                        )}
                                    />
                                </div>
                                <div className="space-y-2 w-48">
                                    <Label htmlFor="end-date" className="flex items-center gap-2 text-primary-700 text-sm">
                                        <Calendar className="h-4 w-4 flex-shrink-0" />
                                        <span className="truncate">Date fin (optionnel)</span>
                                    </Label>
                                    <Controller
                                        name="endDate"
                                        control={control}
                                        render={({ field }) => (
                                            <DatePicker
                                                date={parseDateString(field.value)}
                                                onDateChange={(date) => {
                                                    const dateString = formatDateToString(date)
                                                    field.onChange(dateString)
                                                }}
                                                placeholder="Date fin (optionnel)"
                                                className="w-full"
                                            />
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Section État */}
                            <div className="space-y-2 min-w-[200px]">
                                <Label className="flex items-center gap-2 text-primary-700">
                                    <Truck className="h-4 w-4" />
                                    Etat Livraison
                                </Label>
                                <Controller
                                    name="status"
                                    control={control}
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger className="transition-all hover:border-primary-300 focus:border-primary focus:ring-primary">
                                                <SelectValue placeholder="Sélectionner un état" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                                {statusOptions.map((option) => (
                                                    <SelectItem
                                                        key={option.value}
                                                        value={option.value}
                                                        className={`${option.bg} hover:bg-primary-50 focus:bg-primary-50 cursor-pointer`}
                                                    >
                                                        <span className={`${option.color} font-medium`}>{option.label}</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            {(user?.role === Role.RECOUVREMENT || user?.role === Role.ADMIN) && (
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-primary-700">
                                        <DollarSign className="h-4 w-4" />
                                        Etat paiement
                                    </Label>
                                    <Controller
                                        name="paymentStatus"
                                        control={control}
                                        render={({ field }) => (
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <SelectTrigger className="transition-all hover:border-primary-300 focus:border-primary focus:ring-primary">
                                                    <SelectValue placeholder="Sélectionner un état" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white">
                                                    {paiementOptions.map((option) => (
                                                        <SelectItem
                                                            key={option.value}
                                                            value={option.value}
                                                            className={`${option.bg} hover:bg-primary-50 focus:bg-primary-50 cursor-pointer`}
                                                        >
                                                            <span className={`${option.color} font-medium`}>{option.label}</span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            )}
                            {(user?.role === Role.RECOUVREMENT || user?.role === Role.ADMIN) && (
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-primary-700">
                                        <Building className="h-4 w-4 mr-2 text-primary" />
                                        Dépôt
                                    </Label>
                                    <Controller
                                        name="depot"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            >
                                                <SelectTrigger className="transition-all hover:border-primary-300 focus:border-primary focus:ring-primary">
                                                    <SelectValue
                                                        placeholder="Sélectionner un dépôt"
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
                                        )}
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                {/* Utilisation du composant unifié ScanUnified */}
                                {(user?.role === Role.MAGASINIER ||
                                    user?.role === Role.CHEF_DEPOT ||
                                    user?.role === Role.CONTROLEUR ||
                                    user?.role === Role.SUPERVISEUR_MAGASIN) && (
                                        <ScanUnified
                                            depot={depots.find((depot) => depot.id === user?.depotId)}
                                            role={getScanRole(user.role)}
                                            onScan={(result) => {
                                                const trimmedResult = result?.trim()
                                                setValue('search', trimmedResult, { shouldDirty: true, shouldTouch: true })
                                                // Déclencher la recherche automatiquement après le scan
                                                setTimeout(() => {
                                                    updateURL({ search: trimmedResult })
                                                    previousValuesRef.current.search = trimmedResult
                                                }, 100)
                                            }}
                                        />
                                    )}
                            </div>
                        </div>
                        {/* Section Droite: Recherche */}
                        <div className="space-y-2 w-64">
                            <Label className="flex items-center gap-2 text-primary-700">
                                <Search className="h-4 w-4" />
                                Rechercher
                            </Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Controller
                                        name="search"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                {...field}
                                                type="text"
                                                placeholder="Rechercher..."
                                                className="pr-8"
                                                onKeyPress={handleKeyPress}
                                            />
                                        )}
                                    />
                                    {watchedValues.search && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                                            onClick={handleClearSearch}
                                            aria-label="Effacer la recherche"
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                                <Button
                                    onClick={handleSearch}
                                    size="sm"
                                    className="px-3"
                                    aria-label="Lancer la recherche"
                                >
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    )
}