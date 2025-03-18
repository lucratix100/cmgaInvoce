'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Building, Calendar, Filter, Search } from "lucide-react"
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
    onDateChange
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
        status: searchParams.get('status') || "tous",
        searchInvoice: searchParams.get('search') || ""
    })
    const [searchField, setSearchField] = useState("invoiceNumber")
    const [user, setUser] = useState<any>(null)

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
        // Mettre à jour les filtres depuis l'URL au chargement
        const params = new URLSearchParams(searchParams.toString())
        onDateChange(
            params.get('startDate') || today,
            params.get('endDate') || ''
        )
        if (params.get('status')) {
            onStatusChange(params.get('status')!)
        }
        if (params.get('search')) {
            onSearch(params.get('search')!)
        }
    }, [])

    const updateURL = (newFilters: typeof filters) => {
        const params = new URLSearchParams(searchParams.toString())

        // Mettre à jour les paramètres
        params.set('startDate', newFilters.startDate)
        if (newFilters.endDate) {
            params.set('endDate', newFilters.endDate)
        } else {
            params.delete('endDate')
        }
        if (newFilters.status) {
            params.set('status', newFilters.status)
        } else {
            params.delete('status')
        }
        if (newFilters.searchInvoice) {
            params.set('search', newFilters.searchInvoice)
        } else {
            params.delete('search')
        }

        // Mettre à jour l'URL
        router.push(`?${params.toString()}`, { scroll: false })
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSearch(e.target.value)
    }

    const handleDateChange = (type: 'start' | 'end', value: string) => {
        const newFilters = {
            ...filters,
            [type === 'start' ? 'startDate' : 'endDate']: value
        }
        setFilters(newFilters)

        // Mettre à jour l'URL et le store en une seule fois
        updateURL(newFilters)
        onDateChange(newFilters.startDate, newFilters.endDate)

        // Supprimer l'appel à fetchInvoices ici car il est déjà géré dans setDateRange
    }

    return (
        <Card className="border-none shadow-md overflow-hidden bg-white">
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
                            <Select value={currentStatus} onValueChange={onStatusChange}>
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
    )
}