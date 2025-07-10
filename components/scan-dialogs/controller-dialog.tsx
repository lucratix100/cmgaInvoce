'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Check, Package, User, Calendar, X, AlertCircle, Keyboard } from "lucide-react"

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

interface ControllerDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    scannedValue: string
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
    onTestMode: () => void
    errorMessage: string
    loading: boolean
    isTestMode: boolean
    inputRef: React.RefObject<HTMLInputElement | null>
    invoiceData: Invoice | null
    pendingBls: Bl[]
    confirmingBl: boolean
    onConfirmBl: (blId: number) => void
    onClose: () => void
    formatAmount: (amount: number) => string
}

export default function ControllerDialog({
    isOpen,
    onOpenChange,
    scannedValue,
    onInputChange,
    onKeyDown,
    onTestMode,
    errorMessage,
    loading,
    isTestMode,
    inputRef,
    invoiceData,
    pendingBls,
    confirmingBl,
    onConfirmBl,
    onClose,
    formatAmount
}: ControllerDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex justify-between items-center">
                        Scanner une facture pour confirmation
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="rounded-full"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="scanner-input">Scannez le code-barres de la facture</Label>
                        <Input
                            ref={inputRef}
                            id="scanner-input"
                            value={scannedValue}
                            onChange={onInputChange}
                            onKeyDown={onKeyDown}
                            className="text-center text-lg font-medium"
                            placeholder={isTestMode ? "Saisissez le numéro de facture..." : "En attente du scan..."}
                        />
                        {errorMessage && (
                            <div className="flex items-center justify-center gap-2 text-sm text-red-500">
                                {errorMessage === "Cette facture n'existe pas" && (
                                    <AlertCircle className="h-4 w-4" />
                                )}
                                <span>{errorMessage}</span>
                            </div>
                        )}
                    </div>

                    {!invoiceData ? (
                        <div className="space-y-4">
                            <div className="text-sm text-gray-500 text-center">
                                <p>Scannez le code-barres d'une facture en cours de livraison</p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={onTestMode}
                                className="w-full"
                                disabled={loading}
                            >
                                <Keyboard className="h-4 w-4 mr-2" />
                                Mode test (saisie manuelle)
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Informations de la facture */}
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-blue-900">Facture {invoiceData.invoiceNumber}</h3>
                                    <div className="flex gap-2">
                                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                            {invoiceData.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Informations principales */}
                                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-blue-600" />
                                            <span className="text-blue-700 font-medium">Client:</span>
                                            <span className="text-blue-800">{invoiceData.customer?.name || 'Non spécifié'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-blue-700 font-medium">N° Compte:</span>
                                            <span className="text-blue-800">{invoiceData.accountNumber}</span>
                                        </div>
                                        {invoiceData.customer?.phone && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-blue-700 font-medium">Téléphone:</span>
                                                <span className="text-blue-800">{invoiceData.customer.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-blue-600" />
                                            <span className="text-blue-700 font-medium">Date:</span>
                                            <span className="text-blue-800">{new Date(invoiceData.date).toLocaleDateString('fr-FR')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-blue-700 font-medium">Montant TTC:</span>
                                            <span className="text-blue-800 font-semibold">{formatAmount(invoiceData.totalTtc)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Produits commandés */}
                                <div className="border-t border-blue-200 pt-4">
                                    <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        Produits commandés ({invoiceData.order.length})
                                    </h4>
                                    <div className="max-h-40 overflow-y-auto space-y-2">
                                        {invoiceData.order.map((product, index) => (
                                            <div key={`${product.reference}-${index}`} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-blue-200">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-blue-900 truncate">{product.designation}</p>
                                                    <p className="text-xs text-blue-600">Réf: {product.reference}</p>
                                                </div>
                                                <div className="flex items-center gap-4 text-right">
                                                    <div>
                                                        <p className="text-xs text-blue-600">Quantité</p>
                                                        <p className="font-medium text-blue-900">{product.quantite}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-blue-600">Prix unit.</p>
                                                        <p className="font-medium text-blue-900">{formatAmount(product.prixUnitaire)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-blue-600">Total</p>
                                                        <p className="font-medium text-blue-900">{formatAmount(product.total)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* BLs en attente de confirmation */}
                            {pendingBls.length > 0 ? (
                                <div className="space-y-4">
                                    <h4 className="font-medium text-gray-900">BLs en attente de confirmation</h4>
                                    {pendingBls.map((bl) => (
                                        <div key={bl.id} className="border rounded-lg p-4 bg-yellow-50">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <p className="font-medium">BL #{bl.id}</p>
                                                    <p className="text-sm text-gray-600">
                                                        Créé le {new Date(bl.createdAt).toLocaleDateString('fr-FR')}
                                                    </p>
                                                    {bl.driver && (
                                                        <p className="text-sm text-gray-600">
                                                            Chauffeur: {bl.driver.firstname} {bl.driver.lastname}
                                                        </p>
                                                    )}
                                                </div>
                                                <Button
                                                    onClick={() => onConfirmBl(bl.id)}
                                                    disabled={confirmingBl}
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    {confirmingBl ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Confirmation...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Check className="h-4 w-4 mr-2" />
                                                            Confirmer ce BL
                                                        </>
                                                    )}
                                                </Button>
                                            </div>

                                            {/* Produits du BL */}
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium">Produits livrés:</p>
                                                <div className="max-h-32 overflow-y-auto">
                                                    {bl.products.map((product: any, index: number) => (
                                                        <div key={index} className="flex justify-between text-sm py-1 border-b border-yellow-200 last:border-b-0">
                                                            <span>{product.designation || product.reference}</span>
                                                            <span className="font-medium">{product.quantite} unités</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                    <p>Aucun BL en attente de confirmation pour cette facture</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
} 