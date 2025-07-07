'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Keyboard } from "lucide-react"
import { getInvoiceByNumber, updateInvoiceStatus } from "@/actions/invoice"
import InvoiceConfirmationDialog from "./invoice-scan-confirmation-dialog"
import { InvoiceStatus } from '@/types/enums'

interface ScanChefDepotProps {
    isOpen: boolean
    onClose: () => void
    onScan?: (result: string) => void
}

export default function ScanChefDepot({ isOpen, onClose, onScan }: ScanChefDepotProps) {
    const [numeroFacture, setNumeroFacture] = useState("")
    const [loading, setLoading] = useState(false)
    const [isTestMode, setIsTestMode] = useState(false)
    const [dots, setDots] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [invoiceData, setInvoiceData] = useState<any>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const { toast } = useToast()

    useEffect(() => {
        if (isOpen && !isTestMode) {
            inputRef.current?.focus()
        }
    }, [isOpen, isTestMode])

    useEffect(() => {
        if (!isTestMode) {
            const interval = setInterval(() => {
                setDots(prev => prev.length >= 3 ? "" : prev + ".")
            }, 500)
            return () => clearInterval(interval)
        }
    }, [isTestMode])

    // Effet pour détecter automatiquement un scan complet
    useEffect(() => {
        if (numeroFacture.trim() && !loading && !showConfirmation) {
            // Attendre un court délai pour s'assurer que le scan est complet
            const timer = setTimeout(() => {
                if (numeroFacture.trim()) {
                    handleScan()
                }
            }, 100) // Délai de 100ms pour laisser le temps au scanner de terminer

            return () => clearTimeout(timer)
        }
    }, [numeroFacture])

    // Effet pour remettre le focus quand le dialogue de confirmation se ferme
    useEffect(() => {
        if (!showConfirmation && isOpen && !loading) {
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus()
                    inputRef.current.select()
                }
            }, 100)
        }
    }, [showConfirmation, isOpen, loading])

    const handleTestMode = () => {
        setIsTestMode(true)
        inputRef.current?.focus()
    }

    const handleClose = () => {
        console.log("Fermeture du dialogue de scan")
        resetScanState()
        onClose()
    }

    // Fonction pour gérer les changements d'état du dialogue
    const handleOpenChange = (open: boolean) => {
        console.log("handleOpenChange appelé avec open:", open, "isOpen:", isOpen)
        // Ne fermer que si l'utilisateur ferme explicitement le dialogue principal
        // et que le dialogue de confirmation n'est pas ouvert
        if (!open && isOpen && !showConfirmation) {
            handleClose()
        }
    }

    // Fonction pour réinitialiser seulement les états internes sans fermer le dialogue
    const resetScanState = () => {
        console.log("Réinitialisation des états de scan")
        setNumeroFacture("")
        setErrorMessage("")
        setShowConfirmation(false)
        setInvoiceData(null)
        setLoading(false)
        // Ne pas appeler onClose() ici pour garder le dialogue ouvert
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && numeroFacture.trim()) {
            e.preventDefault() // Empêcher le comportement par défaut
            handleScan()
        }
    }

    const handleScan = async () => {
        if (!numeroFacture.trim()) {
            setErrorMessage("Veuillez entrer un numéro de facture")
            return
        }

        try {
            setLoading(true)
            setErrorMessage("")
            const response = await getInvoiceByNumber(numeroFacture)

            console.log(response, "response");

            if (response.error) {
                setErrorMessage(response.error)
                return
            }

            if (!response || !response.invoice) {
                setErrorMessage("Facture non trouvée")
                return
            }

            if (response.invoice.status !== InvoiceStatus.NON_RECEPTIONNEE) {
                setErrorMessage("Cette facture a déjà été scannée")
                return
            }

            setInvoiceData(response.invoice)
            setShowConfirmation(true)

        } catch (error: any) {
            console.error('Erreur lors du scan:', error)
            if (error.message) {
                setErrorMessage(error.message)
            } else {
                setErrorMessage("Une erreur est survenue lors du scan de la facture")
            }
        } finally {
            setLoading(false)
        }
    }

    const handleConfirmInvoice = async () => {
        try {
            setLoading(true)
            console.log("Début de la validation de la facture:", numeroFacture)

            const responseUpdate = await updateInvoiceStatus(numeroFacture, "en attente de livraison")
            console.log("Réponse de mise à jour:", responseUpdate)

            toast({
                title: "Succès",
                description: "Facture scannée et mise à jour avec succès",
            })

            // Ne pas appeler onScan automatiquement pour éviter la redirection
            // onScan(numeroFacture)

            console.log("Réinitialisation du dialogue...")

            // Réinitialiser les états sans fermer le dialogue
            resetScanState()

            // Remettre le focus sur le champ de saisie avec un délai plus long
            setTimeout(() => {
                console.log("Remise du focus sur le champ de saisie")
                if (inputRef.current) {
                    inputRef.current.focus()
                    inputRef.current.select()
                }
            }, 200)

        } catch (error: any) {
            console.error('Erreur lors de la validation:', error)
            setLoading(false)
            if (error.message) {
                setErrorMessage(error.message)
            } else {
                setErrorMessage("Une erreur est survenue lors de la validation de la facture")
            }
        }
    }

    const handleCancelInvoice = () => {
        console.log("Annulation de la facture:", numeroFacture)

        // Réinitialiser les états sans fermer le dialogue
        resetScanState()

        // Remettre le focus sur le champ de saisie
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus()
                inputRef.current.select()
            }
        }, 100)
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Scanner le numéro de facture</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="scanner-input">Scannez le code-barres</Label>
                            <Input
                                ref={inputRef}
                                id="scanner-input"
                                value={numeroFacture}
                                onChange={(e) => setNumeroFacture(e.target.value)}
                                onKeyDown={handleKeyDown}
                                // readOnly={!isTestMode}
                                className="text-center text-lg font-medium"
                                placeholder={isTestMode ? "Saisissez le numéro de facture..." : `En attente du scan${dots}`}
                            />
                            {errorMessage && (
                                <p className="text-sm text-red-500 text-center">{errorMessage}</p>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div className="text-sm text-gray-500 text-center">
                                <p>Scannez le code-barres de la facture</p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleTestMode}
                                className="w-full"
                            >
                                <Keyboard className="h-4 w-4 mr-2" />
                                Mode test (saisie manuelle)
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialogue de confirmation */}
            <InvoiceConfirmationDialog
                isOpen={showConfirmation}
                onClose={handleCancelInvoice}
                onConfirm={handleConfirmInvoice}
                invoiceData={invoiceData}
                loading={loading}
            />
        </>
    )
}
