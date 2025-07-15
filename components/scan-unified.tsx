'use client'

import { useState, useRef, useCallback } from "react"
import { getInvoiceByNumber, getBlsByInvoice, confirmBl, updateInvoiceStatus } from "@/actions/invoice"
import { InvoiceStatus } from "@/types/enums"
import { useActivityInvalidation } from "@/hooks/useActivityInvalidation"
import GestionFacture from "./facture/gestion-facture"
import InvoiceConfirmationDialog from "./invoice-scan-confirmation-dialog"
import { ScanMainDialog, ControllerDialog } from "./scan-dialogs"
import { depot } from "@/types"
import { toast } from "sonner"

interface ScanUnifiedProps {
    role: 'chef-depot' | 'magasinier' | 'superviseur-magasin' | 'controller'
    onScan?: (result: string) => void
    isOpen?: boolean
    onClose?: () => void
    depot?: depot | null
}

interface InvoiceProduct {
    reference: string
    designation: string
    quantite: number
    prixUnitaire: number
    total: number
}

interface Invoice {
    id: number
    invoiceNumber: string
    accountNumber: string
    date: string
    status: string
    isCompleted: boolean
    isCompleteDelivery: boolean
    order: InvoiceProduct[]
    customer: {
        id: number
        name: string
        phone: string
    } | null
    depotId: number
    totalTtc: number
    statusPayment: string
}

interface Bl {
    id: number
    status: string
    products: any[]
    total: number
    createdAt: string
    driver?: {
        firstname: string
        lastname: string
    }
}

export default function ScanUnified({ role, onScan, isOpen: externalIsOpen, onClose: externalOnClose, depot }: ScanUnifiedProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(false)
    const [scannedValue, setScannedValue] = useState("")
    const [isTestMode, setIsTestMode] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const [invoiceData, setInvoiceData] = useState<Invoice | null>(null)
    const [pendingBls, setPendingBls] = useState<Bl[]>([])
    const [confirmingBl, setConfirmingBl] = useState(false)
    const [showGestion, setShowGestion] = useState(false)
    const [showConfirmation, setShowConfirmation] = useState(false)

    const inputRef = useRef<HTMLInputElement>(null)
    const { invalidateAfterAction } = useActivityInvalidation()

    // Gestion de l'état ouvert/fermé
    const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
    const setIsOpen = externalOnClose ? (open: boolean) => {
        if (!open) externalOnClose()
        else setInternalIsOpen(true)
    } : setInternalIsOpen

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF'
        }).format(amount)
    }

    const resetState = useCallback(() => {
        setScannedValue("")
        setErrorMessage("")
        setInvoiceData(null)
        setPendingBls([])
        setConfirmingBl(false)
        setShowGestion(false)
        setShowConfirmation(false)
        setLoading(false)
        setIsTestMode(false)
    }, [])

    const handleClose = useCallback(() => {
        setIsOpen(false)
        resetState()
    }, [setIsOpen, resetState])

    const handleOpen = useCallback(() => {
        if (externalOnClose) {
            externalOnClose()
        } else {
            setInternalIsOpen(true)
        }
    }, [externalOnClose])

    const handleTestMode = useCallback(() => {
        setIsTestMode(true)
        inputRef.current?.focus()
    }, [])

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && scannedValue.trim()) {
            e.preventDefault()
            handleScan()
        }
    }, [scannedValue])

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setScannedValue(value)

        // Détection automatique du scan complet
        // Un scan complet est détecté quand la valeur a une longueur typique d'un numéro de facture
        // et qu'aucune modification n'a eu lieu pendant un court délai
        if (value.trim() && !loading && !showGestion && !showConfirmation) {
            // Détecter un scan complet basé sur la longueur et la stabilité
            const isCompleteScan = value.trim().length >= 8 && value.trim().length <= 15

            if (isCompleteScan) {
                // Attendre un court délai pour s'assurer que le scan est terminé
                setTimeout(() => {
                    // Vérifier que la valeur n'a pas changé pendant le délai
                    if (value.trim() === e.target.value.trim()) {
                        // Déclencher le scan en utilisant la valeur actuelle
                        const currentValue = e.target.value.trim()
                        if (currentValue) {
                            // Appeler directement la logique de scan
                            performScan(currentValue)
                        }
                    }
                }, 200) // Augmenté à 200ms pour plus de fiabilité
            }
        }
    }, [loading, showGestion, showConfirmation])

    // Fonction séparée pour effectuer le scan
    const performScan = useCallback(async (scanValue: string) => {
        if (!scanValue.trim()) {
            setErrorMessage("Veuillez entrer un numéro de facture")
            return
        }

        try {
            setLoading(true)
            setErrorMessage("")

            const response = await getInvoiceByNumber(scanValue)

            if (response.error) {
                setErrorMessage(response.error)
                return
            }

            if (!response || !response.invoice) {
                setErrorMessage("Cette facture n'existe pas")
                return
            }

            const invoice = response.invoice

            // Validation selon le rôle
            switch (role) {
                case 'chef-depot':
                    {
                        if (depot?.needDoubleCheck === true) {
                            // Logique pour double check
                            if (invoice.status !== InvoiceStatus.NON_RECEPTIONNEE) {
                                setErrorMessage("Cette facture a déjà été scannée")
                                return
                            }
                            setInvoiceData(invoice)
                            setShowConfirmation(true)
                        } else {
                            // Logique pour pas de double check
                            if (invoice.status === InvoiceStatus.NON_RECEPTIONNEE) {
                                setInvoiceData(invoice)
                                setShowConfirmation(true)
                                return
                            }
                            setInvoiceData(invoice)
                            setShowGestion(true)
                        }
                        break
                    }

                case 'magasinier':
                case 'superviseur-magasin':
                    if (invoice.status !== InvoiceStatus.EN_ATTENTE && invoice.status !== InvoiceStatus.EN_COURS) {
                        setErrorMessage("Cette facture n'est pas en attente de livraison ou en cours de livraison. Seules ces factures peuvent être gérées.")
                        return
                    }
                    setShowGestion(true)
                    break

                case 'controller':
                    if (invoice.status !== InvoiceStatus.EN_COURS) {
                        setErrorMessage("Cette facture n'est pas en cours de livraison. Seules les factures en cours de livraison peuvent être confirmées.")
                        return
                    }
                    setInvoiceData(invoice)

                    // Récupérer les BLs de la facture
                    const bls = await getBlsByInvoice(scanValue)
                    const pending = bls.filter((bl: Bl) => bl.status === 'en attente de confirmation')
                    setPendingBls(pending)
                    break
            }

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
    }, [role, depot])

    // Fonction handleScan qui utilise performScan
    const handleScan = useCallback(async () => {
        const currentValue = inputRef.current?.value || scannedValue
        if (currentValue.trim()) {
            await performScan(currentValue)
        }
    }, [scannedValue, performScan])

    const handleConfirmBl = useCallback(async (blId: number) => {
        if (!invoiceData) return

        try {
            setConfirmingBl(true)

            const result = await confirmBl(invoiceData.invoiceNumber)

            invalidateAfterAction('confirmation_livraison')

            toast.success(result.message || "BL confirmé avec succès !")

            if (
                result.message &&
                (result.message.includes("Facture livrée") ||
                    result.message.includes("Facture soldée"))
            ) {
                handleClose()
                if (onScan) onScan(invoiceData.invoiceNumber)
                return
            }

            await handleScan()

        } catch (err: any) {
            console.error('Erreur lors de la confirmation:', err)
            toast.error(err.message || "Impossible de confirmer le BL")
        } finally {
            setConfirmingBl(false)
        }
    }, [invoiceData, invalidateAfterAction, toast, handleClose, onScan, handleScan])

    const handleConfirmInvoice = useCallback(async () => {
        try {
            setLoading(true)

            const currentValue = inputRef.current?.value || scannedValue
            const responseUpdate = await updateInvoiceStatus(currentValue, "en attente de livraison")

            toast.success("Facture scannée et mise à jour avec succès")

            resetState()

            setTimeout(() => {
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
    }, [scannedValue, toast, resetState])

    const handleCancelInvoice = useCallback(() => {
        resetState()

        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus()
                inputRef.current.select()
            }
        }, 100)
    }, [resetState])

    const handleSaveGestion = useCallback((produits: Array<{ reference: string, quantiteLivree: number }>) => {
        handleClose()
    }, [handleClose])

    const getRoleConfig = () => {
        switch (role) {
            case 'chef-depot':
                return {
                    title: "Scanner le numéro de facture",
                    description: "Scannez le code-barres de la facture",
                    buttonText: "Scanner la facture",
                    placeholder: isTestMode ? "Saisissez le numéro de facture..." : "En attente du scan..."
                }
            case 'magasinier':
                return {
                    title: "Scanner le numéro de facture",
                    description: "Scannez le code-barres de la facture",
                    buttonText: "Scanner la facture",
                    placeholder: isTestMode ? "Saisissez le numéro de facture..." : "En attente du scan..."
                }
            case 'superviseur-magasin':
                return {
                    title: "Scanner le numéro de facture",
                    description: "Scannez le code-barres de la facture. Le chauffeur et le magasinier seront sélectionnés après le scan",
                    buttonText: "Scanner la facture",
                    placeholder: isTestMode ? "Saisissez le numéro de facture..." : "En attente du scan..."
                }
            case 'controller':
                return {
                    title: "Scanner une facture pour confirmation",
                    description: "Scannez le code-barres d'une facture en cours de livraison",
                    buttonText: "Scanner pour confirmer",
                    placeholder: isTestMode ? "Saisissez le numéro de facture..." : "En attente du scan..."
                }
        }
    }

    const config = getRoleConfig()

    // Rendu conditionnel selon le rôle
    if (role === 'controller') {
        return (
            <>
                <ControllerDialog
                    isOpen={isOpen}
                    onOpenChange={setIsOpen}
                    scannedValue={scannedValue}
                    onInputChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onTestMode={handleTestMode}
                    errorMessage={errorMessage}
                    loading={loading}
                    isTestMode={isTestMode}
                    inputRef={inputRef}
                    invoiceData={invoiceData}
                    pendingBls={pendingBls}
                    confirmingBl={confirmingBl}
                    onConfirmBl={handleConfirmBl}
                    onClose={handleClose}
                    formatAmount={formatAmount}
                />
            </>
        )
    }

    return (
        <>
            <ScanMainDialog
                isOpen={isOpen}
                onOpenChange={(open) => {
                    if (!open) handleClose();
                    else setIsOpen(true);
                }}
                scannedValue={scannedValue}
                onInputChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onTestMode={handleTestMode}
                errorMessage={errorMessage}
                loading={loading}
                isTestMode={isTestMode}
                title={config.title}
                description={config.description}
                buttonText={config.buttonText}
                placeholder={config.placeholder}
                inputRef={inputRef}
            />

            {/* Composants conditionnels selon le rôle */}
            {(role === 'magasinier' || role === 'superviseur-magasin' || role === 'chef-depot') && (
                <GestionFacture
                    isOpen={showGestion}
                    onClose={() => setShowGestion(false)}
                    numeroFacture={scannedValue}
                    reSetState={resetState}
                    onSave={handleSaveGestion}
                    isSuperviseurMagasin={role === 'superviseur-magasin'}
                />
            )}

            {role === 'chef-depot' && (
                <InvoiceConfirmationDialog
                    isOpen={showConfirmation}
                    onClose={handleCancelInvoice}
                    onConfirm={handleConfirmInvoice}
                    invoiceData={invoiceData}
                    loading={loading}
                />
            )}
        </>
    )
}
