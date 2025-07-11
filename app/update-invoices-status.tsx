'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface UpdateResult {
    success: boolean
    message: string
    updatedCount?: number
    error?: string
}

export default function UpdateInvoicesStatus() {
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<UpdateResult | null>(null)

    const handleUpdateInvoices = async () => {
        if (!startDate || !endDate) {
            toast.error('Veuillez sélectionner les dates de début et de fin')
            return
        }

        if (new Date(startDate) > new Date(endDate)) {
            toast.error('La date de début doit être antérieure à la date de fin')
            return
        }

        setIsLoading(true)
        setResult(null)

        try {
            const response = await fetch('/api/update-invoices-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    startDate,
                    endDate,
                }),
            })

            const data: UpdateResult = await response.json()

            if (data.success) {
                toast.success(data.message)
                setResult(data)
            } else {
                toast.error(data.error || 'Erreur lors de la mise à jour')
                setResult(data)
            }
        } catch (error) {
            console.error('Erreur:', error)
            toast.error('Erreur de connexion au serveur')
            setResult({
                success: false,
                message: 'Erreur de connexion',
                error: 'Impossible de se connecter au serveur'
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Mise à jour du statut des factures
                    </CardTitle>
                    <CardDescription>
                        Mettre à jour le statut des factures contenant la lettre "R" dans leur référence
                        pour un intervalle de dates donné. Les factures seront marquées comme "retour"
                        et leur montant total sera mis en négatif.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Date de début</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">Date de fin</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleUpdateInvoices}
                        disabled={isLoading || !startDate || !endDate}
                        className="w-full"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Mise à jour en cours...
                            </>
                        ) : (
                            'Mettre à jour les factures'
                        )}
                    </Button>

                    {result && (
                        <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                            {result.success ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                                <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                            <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
                                {result.message}
                                {result.updatedCount !== undefined && (
                                    <div className="mt-2 font-semibold">
                                        Nombre de factures mises à jour : {result.updatedCount}
                                    </div>
                                )}
                                {result.error && (
                                    <div className="mt-2 text-sm">
                                        Détails : {result.error}
                                    </div>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-2">Informations :</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                            <li>• Seules les factures contenant la lettre "R" dans leur numéro de facture seront mises à jour</li>
                            <li>• Le statut sera changé en "retour"</li>
                            <li>• Le montant total (totalTTC) sera mis en négatif</li>
                            <li>• L'intervalle de dates est inclusif (début et fin)</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
} 