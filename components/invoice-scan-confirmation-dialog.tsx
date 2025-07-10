'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Check, X, User, Calendar, Package } from "lucide-react"

interface InvoiceConfirmationDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    invoiceData: any
    loading: boolean
}

export default function InvoiceConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    invoiceData,
    loading
}: InvoiceConfirmationDialogProps) {
    // Fonction pour formater le montant TTC
    const formatAmount = (amount: number | undefined) => {
        if (!amount || isNaN(amount)) return "0 FCFA";
        return `${amount.toLocaleString('fr-FR')} FCFA`;
    };

    return (
        <Dialog open={isOpen}>
            <DialogContent className="sm:max-w-[800px] max-h-[100vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Confirmation de la facture
                    </DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    {invoiceData && (
                        <>
                           {/* En-tête de la facture */}
                            <div className="bg-blue-50 p-4 rounded-lg mb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-blue-900">Facture {invoiceData.invoiceNumber}</h3>
                                        <p className="text-blue-700">N° Compte: {invoiceData.accountNumber}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-blue-600">Statut actuel</p>
                                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">{invoiceData.status}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Informations client et détails facture */}
                            <div className="grid grid-cols-2 gap-4">
                                {invoiceData.customer && (
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                            <User className="h-4 w-4" />Informations client
                                        </h4>
                                        <div className="grid gap-1">
                                            <div><span className="text-gray-600">Nom:</span> <span className="font-medium">{invoiceData.customer.name}</span></div>
                                            <div><span className="text-gray-600">Téléphone:</span> <span className="font-medium">{invoiceData.customer.phone}</span></div>
                                        </div>
                                    </div>
                                )}                                
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />Détails de la facture
                                    </h4>
                                    <div className="grid gap-1">
                                        <div><span className="text-gray-600">Date:</span> <span className="font-medium">{new Date(invoiceData.date).toLocaleDateString('fr-FR')}</span></div>
                                        <div><span className="text-gray-600">Montant TTC:</span> <span className="font-medium">{formatAmount(invoiceData.totalTtc)}</span></div>
                                    </div>
                                </div>
                            </div>
                            {/* Produits de la facture */}
                            {invoiceData.order && Array.isArray(invoiceData.order) && invoiceData.order.length > 0 && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-900 mb-3">Produits commandés</h4>
                                    <div className={`space-y-2 ${invoiceData.order.length > 3 ? 'h-[180px]' : ''} overflow-y-auto p-2`}>
                                        {invoiceData.order.map((product: any, index: number) => (
                                            <div key={index} className="flex justify-between items-center text-sm border-b border-gray-200 pb-2">
                                                <div className="flex-1">
                                                    <p className="font-medium">{product.designation || product.reference}</p>
                                                    <p className="text-gray-600 text-xs">
                                                        Réf: {product.reference}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium">
                                                        {product.quantity || product.quantite || 0} unités
                                                    </p>
                                                    <p className="text-gray-600 text-xs">
                                                        {(product.unitPrice || product.prixUnitaire)?.toLocaleString('fr-FR')} FCFA
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Message de confirmation */}
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                                <p className="text-yellow-800 text-sm">
                                    <strong>Confirmation :</strong> En validant, cette facture passera <span className="font-bold text-blue-600"> en attente de livraison </span> 
                                    et sera disponible pour le magasinier.
                                </p>
                            </div>
                        </>
                    )}

                    {/* Boutons d'action */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1"
                        >
                            <X className="h-4 w-4 mr-2" />
                            Annuler
                        </Button>
                        <Button
                            onClick={onConfirm}
                            disabled={loading}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Validation en cours...
                                </>
                            ) : (
                                <>
                                    <Check className="mr-2 h-4 w-4" />
                                    Confirmer et valider
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
} 