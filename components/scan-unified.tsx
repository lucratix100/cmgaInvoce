'use client'

import { useState, useRef, useCallback } from "react"
import { useToast } from "@/components/ui/use-toast"
import { getInvoiceByNumber, getBlsByInvoice, confirmBl, updateInvoiceStatus } from "@/actions/invoice"
import { InvoiceStatus } from "@/types/enums"
import { useActivityInvalidation } from "@/hooks/useActivityInvalidation"
import GestionFacture from "./facture/gestion-facture"
import InvoiceConfirmationDialog from "./invoice-scan-confirmation-dialog"
import { ScanMainDialog, ControllerDialog } from "./scan-dialogs"

interface ScanUnifiedProps {
    role: 'chef-depot' | 'magasinier' | 'superviseur-magasin' | 'controller'
    onScan?: (result: string) => void
    isOpen?: boolean
    onClose?: () => void
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

export default function ScanUnified({ role, onScan, isOpen: externalIsOpen, onClose: externalOnClose }: ScanUnifiedProps) {
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
    const { toast } = useToast()
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
        
        // Détection automatique du scan complet (sans useEffect)
        if (value.trim() && !loading && !showGestion && !showConfirmation) {
            setTimeout(() => {
                if (value.trim() === scannedValue && value.trim()) {
                    handleScan()
                }
            }, 100)
        }
    }, [loading, showGestion, showConfirmation, scannedValue])

    const handleScan = useCallback(async () => {
        if (!scannedValue.trim()) {
            setErrorMessage("Veuillez entrer un numéro de facture")
            return
        }

        try {
            setLoading(true)
            setErrorMessage("")
            
            const response = await getInvoiceByNumber(scannedValue)
            
            if (response.error) {
                setErrorMessage(response.error)
                return
            }
            
            if (!response || !response.invoice) {
                setErrorMessage("Facture non trouvée")
                return
            }

            const invoice = response.invoice

            // Validation selon le rôle
            switch (role) {
                case 'chef-depot':
                    if (invoice.status !== InvoiceStatus.NON_RECEPTIONNEE) {
                        setErrorMessage("Cette facture a déjà été scannée")
                        return
                    }
                    setInvoiceData(invoice)
                    setShowConfirmation(true)
                    break

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
                    const bls = await getBlsByInvoice(scannedValue)
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
    }, [scannedValue, role])

    const handleConfirmBl = useCallback(async (blId: number) => {
        if (!invoiceData) return
        
        try {
            setConfirmingBl(true)
            
            const result = await confirmBl(invoiceData.invoiceNumber)
            
            invalidateAfterAction('confirmation_livraison')
            
            toast({ 
                title: "Succès", 
                description: result.message || "BL confirmé avec succès !" 
            })
            
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
            toast({ 
                title: "Erreur", 
                description: err.message || "Impossible de confirmer le BL", 
                variant: "destructive" 
            })
        } finally {
            setConfirmingBl(false)
        }
    }, [invoiceData, invalidateAfterAction, toast, handleClose, onScan, handleScan])

    const handleConfirmInvoice = useCallback(async () => {
        try {
            setLoading(true)
            
            const responseUpdate = await updateInvoiceStatus(scannedValue, "en attente de livraison")
            
            toast({
                title: "Succès",
                description: "Facture scannée et mise à jour avec succès",
            })

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
                onOpenChange={setIsOpen}
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
            {(role === 'magasinier' || role === 'superviseur-magasin') && (
                <GestionFacture
                    isOpen={showGestion}
                    onClose={() => setShowGestion(false)}
                    numeroFacture={scannedValue}
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
