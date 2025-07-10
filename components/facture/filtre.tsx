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
    const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

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

    // Configuration de react-hook-form avec mode "onBlur" pour éviter les re-renders
    const {
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { isDirty }
    } = useForm<FilterFormData>({
        resolver: zodResolver(filterSchema),
        defaultValues,
        mode: "onBlur" // Changé de "onChange" à "onBlur" pour éviter les re-renders
    })

    // Surveiller les changements de valeurs pour déclencher les callbacks
    const watchedValues = watch()

    // Fonction de debounce pour la recherche
    const debouncedSearch = useCallback((searchValue: string) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }

        searchTimeoutRef.current = setTimeout(() => {
            onSearch(searchValue)
        }, 300) // 300ms de délai
    }, [onSearch])

    // Mise à jour de l'URL et des callbacks avec debounce
    const updateURLAndCallbacks = useCallback((values: FilterFormData) => {
        const params = new URLSearchParams(searchParams.toString())

        // Si une recherche est spécifiée, ne pas inclure la date pour permettre une recherche globale
        const hasSearch = values.search && values.search.trim() !== ''

        Object.entries(values).forEach(([key, value]) => {
            if (value && value !== 'tous') {
                // Ne pas inclure startDate si il y a une recherche
                if (hasSearch && key === 'startDate') {
                    params.delete(key)
                } else {
                    params.set(key, value)
                }
            } else {
                params.delete(key)
            }
        })

        router.replace(`?${params.toString()}`, { scroll: false })

        // Appeler les callbacks appropriés
        if (values.status) onStatusChange(values.status)
        if (values.startDate || values.endDate) {
            onDateChange(values.startDate, values.endDate)
        }
        if (values.paymentStatus && onPaymentStatusChange) {
            onPaymentStatusChange(values.paymentStatus)
        }
        if (values.depot && onDepotChange) {
            onDepotChange(values.depot)
        }
    }, [searchParams, router, onStatusChange, onDateChange, onPaymentStatusChange, onDepotChange])

    // Effet pour surveiller les changements et mettre à jour l'URL (sauf pour la recherche)
    useEffect(() => {
        if (isDirty) {
            const { search, ...otherValues } = watchedValues
            updateURLAndCallbacks({ ...otherValues, search: search || "" })
        }
    }, [watchedValues, isDirty, updateURLAndCallbacks])

    // Effet séparé pour la recherche avec debounce
    useEffect(() => {
        if (watchedValues.search !== undefined) {
            debouncedSearch(watchedValues.search)
        }
    }, [watchedValues.search, debouncedSearch])

    // Nettoyage du timeout
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [])

    // Gestion des erreurs améliorée
    const handleError = (error: unknown, context: string) => {
        console.error(`Erreur dans ${context}:`, error)
        setError(`Une erreur est survenue lors de ${context}. Veuillez réessayer.`)
    }

    const statusOptions = useMemo(() => [
        { value: "tous", label: "TOUS" },
        { value: "non réceptionnée", label: "NON RÉCEPTIONNÉE" },
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
                    <Controller
                        name="search"
                        control={control}
                        render={({ field }) => (
                            <Input
                                {...field}
                                type="text"
                                placeholder="Rechercher une facture..."
                                className="w-full"
                                aria-label="Rechercher une facture"
                                role="searchbox"
                            />
                        )}
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
                                État livraison
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
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
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
                                    État paiement
                                </Label>
                                <Controller
                                    name="paymentStatus"
                                    control={control}
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
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
                                    )}
                                />
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
                                    État livraison
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
                                                        className="hover:bg-primary-50 focus:bg-primary-50 cursor-pointer"
                                                    >
                                                        {option.label}
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
                                        État paiement
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
                                                            className="hover:bg-primary-50 focus:bg-primary-50 cursor-pointer"
                                                        >
                                                            {option.label}
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
                                                setValue('search', result)
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
                            <Controller
                                name="search"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        type="text"
                                        placeholder="Rechercher..."
                                        className="w-full"
                                    />
                                )}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    )
}