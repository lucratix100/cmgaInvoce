'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Check, CheckCheck, Loader2 } from "lucide-react"
import { getInvoiceByNumber } from "@/actions/invoice"
import { processDelivery, getBlsByInvoice } from "@/actions/invoice"
import { getDrivers } from "@/actions/driver"
import { InvoiceStatus } from "@/types/enums"

interface GestionFactureProps {
    isOpen: boolean
    onClose: () => void
    numeroFacture: string
    onSave: (produits: Array<{ reference: string, quantiteLivree: number }>) => void
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

export default function GestionFacture({ isOpen, onClose, numeroFacture, onSave }: GestionFactureProps) {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [facture, setFacture] = useState<Invoice | null>(null)
    const [quantitesLivrees, setQuantitesLivrees] = useState<{ [reference: string]: number }>({})
    const [drivers, setDrivers] = useState<Array<{ id: number, firstname: string, lastname: string, isActive: boolean }>>([])
    const [selectedDriver, setSelectedDriver] = useState<string>("")
    const [hasPendingBl, setHasPendingBl] = useState(false)
    const [deliveredQuantities, setDeliveredQuantities] = useState<{ [reference: string]: number }>({})
    const { toast } = useToast()

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF'
        }).format(amount)
    }

    useEffect(() => {
        if (isOpen) {
            fetchFacture()
            fetchDrivers()
        }
    }, [isOpen, numeroFacture])

    const fetchFacture = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await getInvoiceByNumber(numeroFacture)
            
            if (!response || !response.invoice) {
                throw new Error('Facture non trouvée')
            }

            setFacture(response.invoice)

            const bls = await getBlsByInvoice(numeroFacture);

            // 1. Trouver le dernier BL validé pour obtenir les remainingQty
            const validatedBls = bls
                .filter((bl: any) => bl.status === 'validée' || bl.status === 'livrée')
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
            const lastValidatedBl = validatedBls.length > 0 ? validatedBls[0] : null;

            // 2. Initialiser les quantités restantes
            const remainingQuantities: { [ref: string]: number } = {};
            
            if (lastValidatedBl) {
                // Utiliser les remainingQty du dernier BL validé
                const products = typeof lastValidatedBl.products === 'string' 
                    ? JSON.parse(lastValidatedBl.products) 
                    : lastValidatedBl.products;

                products.forEach((p: any) => {
                    remainingQuantities[p.reference] = Number(p.remainingQty || 0);
                });
            } else {
                // Si aucun BL validé, utiliser les quantités de la commande initiale
                response.invoice.order.forEach((p: any) => {
                    remainingQuantities[p.reference] = Number(p.quantite || 0);
                });
            }

            // 3. Soustraire les quantités des BLs en attente de confirmation
            const pendingBls = bls.filter((bl: any) => bl.status === 'en attente de confirmation');
            
            pendingBls.forEach((bl: any) => {
                const products = typeof bl.products === 'string' ? JSON.parse(bl.products) : bl.products;
                products.forEach((p: any) => {
                    if (remainingQuantities.hasOwnProperty(p.reference)) {
                        remainingQuantities[p.reference] -= Number(p.quantite || 0);
                    }
                });
            });

            // 4. Calculer les quantités déjà livrées pour l'affichage
            const deliveredQuantitiesForDisplay: { [ref: string]: number } = {};
            response.invoice.order.forEach((p: any) => {
                const orderedQty = Number(p.quantite || 0);
                const remainingQty = remainingQuantities[p.reference] || 0;
                const deliveredQty = orderedQty - remainingQty;
                deliveredQuantitiesForDisplay[p.reference] = deliveredQty > 0 ? deliveredQty : 0;
                // S'assurer que la quantité restante ne soit pas négative
                remainingQuantities[p.reference] = remainingQty > 0 ? remainingQty : 0;
            });

            // 5. Mettre à jour les états
            setDeliveredQuantities(deliveredQuantitiesForDisplay);
            setQuantitesLivrees(remainingQuantities);
            
            await checkPendingBls(numeroFacture);
            
        } catch (err) {
            console.error('Erreur lors du chargement de la facture:', err)
            setError(err instanceof Error ? err.message : 'Une erreur est survenue')
            toast({
                title: "Erreur",
                description: "Impossible de charger les données de la facture",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const fetchDrivers = async () => {
        try {
            const response = await getDrivers()
            const activeDrivers = response.filter((driver: { isActive: boolean }) => driver.isActive)
            setDrivers(activeDrivers)
        } catch (err) {
            console.error('Erreur lors du chargement des chauffeurs:', err)
            toast({
                title: "Erreur",
                description: "Impossible de charger les chauffeurs",
                variant: "destructive"
            })
        }
    }

    const checkPendingBls = async (invoiceNumber: string) => {
        try {
            const bls = await getBlsByInvoice(invoiceNumber)
            const hasPending = bls.some((bl: any) => bl.status === 'en attente de confirmation')
            setHasPendingBl(hasPending)
            
            if (hasPending) {
                toast({
                    title: "Information",
                    description: "Un BL est déjà en attente de confirmation pour cette facture. Veuillez attendre sa validation avant de créer un nouveau BL.",
                    variant: "default"
                })
            }
        } catch (err) {
            console.error('Erreur lors de la vérification des BLs:', err)
        }
    }

    const handleQuantiteLivreeChange = (reference: string, value: string, maxQuantity: number) => {
        let quantite = parseInt(value, 10)
        if (isNaN(quantite)) {
            quantite = 0
        }
        if (quantite > maxQuantity) {
            quantite = maxQuantity
        }
        if (quantite < 0) {
            quantite = 0
        }
        setQuantitesLivrees(prev => ({ ...prev, [reference]: quantite }))
    }

    const handleSave = async () => {
        try {
            setLoading(true)
            
            // Vérifier qu'un chauffeur est sélectionné
            if (!selectedDriver) {
                console.log("Erreur: Aucun chauffeur sélectionné")
                toast({
                    title: "Erreur",
                    description: "Veuillez sélectionner un chauffeur",
                    variant: "destructive"
                })
                return
            }
            
            console.log("Début de la livraison partielle pour:", numeroFacture)
            
            // Préparer les produits pour la livraison partielle
            const productsForDelivery = Object.entries(quantitesLivrees).map(([reference, quantiteLivree]) => {
                // Trouver le produit correspondant dans la facture
                const product = facture?.order.find((p: any) => p.reference === reference)
                const quantiteValide = Number(quantiteLivree) || 0;
                return {
                    reference,
                    quantiteLivree: quantiteValide,
                    designation: product?.designation || '',
                    quantite: quantiteValide,
                    prixUnitaire: Number(product?.prixUnitaire) || 0
                }
            })

            console.log("Produits pour livraison:", productsForDelivery)

            // Appeler processDelivery avec isCompleteDelivery = false pour une livraison partielle
            const result = await processDelivery(
                numeroFacture,
                productsForDelivery,
                false, // isCompleteDelivery = false pour livraison partielle
                selectedDriver ? parseInt(selectedDriver) : undefined
            )

            console.log("Résultat de la livraison partielle:", result)

            // Vérifier si le message indique qu'il faut attendre une confirmation
            if (result.message && result.message.includes('En attente de la confirmation')) {
                toast({ 
                    title: "Information", 
                    description: result.message,
                    variant: "default"
                })
                // Fermer le dialogue car la confirmation sera faite par un autre rôle
                onClose()
                return
            }

            toast({
                title: "Succès",
                description: result.message || "Livraison partielle enregistrée avec succès",
            })
            
            onSave(productsForDelivery)
            onClose()
        } catch (err: any) {
            console.error('Erreur lors de la sauvegarde:', err)
            toast({
                title: "Erreur",
                description: err.message || "Impossible de sauvegarder les quantités livrées",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const handleValiderLivraison = async () => {
        if (!facture) return;
        try {
            setLoading(true)
            
            // Vérifier qu'un chauffeur est sélectionné
            if (!selectedDriver) {
                console.log("Erreur: Aucun chauffeur sélectionné")
                toast({
                    title: "Erreur",
                    description: "Veuillez sélectionner un chauffeur",
                    variant: "destructive"
                })
                return
            }
            
            console.log("Début de la livraison complète pour:", facture.invoiceNumber)
            
            // Préparer les produits pour la livraison complète
            const productsForDelivery = facture.order.map((product: any) => {
                const quantiteCommandee = Number(product.quantite) || 0;
                const quantiteDejaLivree = Number(deliveredQuantities[product.reference]) || 0;
                const quantiteRestante = Math.max(0, quantiteCommandee - quantiteDejaLivree);
           
                return {  
                    reference: product.reference,
                    quantiteLivree: quantiteRestante,
                    designation: product.designation,
                    quantite: quantiteRestante,
                    prixUnitaire: Number(product.prixUnitaire) || 0
                }
            })

            console.log("Produits pour livraison complète:", productsForDelivery)

            // Appeler processDelivery avec isCompleteDelivery = true pour une livraison complète
            const result = await processDelivery(
                facture.invoiceNumber,
                productsForDelivery,
                true, // isCompleteDelivery = true pour livraison complète
                selectedDriver ? parseInt(selectedDriver) : undefined
            )

            // console.log("result:", result)

            // Si le message indique qu'il faut attendre une confirmation, on ferme le dialogue
            if (result.message && result.message.includes('En attente de la confirmation')) {
                toast({ 
                    title: "Information", 
                    description: result.message,
                    variant: "default"
                })
                // Fermer le dialogue car la confirmation sera faite par un autre rôle
                onClose()
                return
            }

            toast({ 
                title: "Succès", 
                description: result.message || "Livraison complète validée avec succès !" 
            })
            onClose()
        } catch (err: any) {
            console.error('Erreur lors de la validation:', err)
            toast({ 
                title: "Erreur", 
                description: err.message || "Impossible de valider la livraison", 
                variant: "destructive" 
            })
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle>Chargement de la facture</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    if (error || !facture) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle>Erreur</DialogTitle>
                    </DialogHeader>
                    <div className="text-center py-8">
                        <p className="text-red-500">{error || "Facture non trouvée"}</p>
                        <Button variant="outline" onClick={onClose} className="mt-4">
                            Fermer
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="p-6 sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
                <DialogHeader className="pb-4">
                    <DialogTitle>Détails de la facture {facture.invoiceNumber}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Informations de la facture - Layout plus compact */}
                    <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                        <div>
                            <p className="text-gray-500 text-xs">Numéro de compte</p>
                            <p className="font-medium">{facture.accountNumber}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">Date</p>
                            <p className="font-medium">{new Date(facture.date).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">Montant total</p>
                            <p className="font-medium">{formatAmount(facture.totalTtc)}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">Statut</p>
                            <p className="font-medium">{facture.status}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">Client</p>
                            <p className="font-medium">{facture.customer?.name || 'Non spécifié'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">Statut de paiement</p>
                            <p className="font-medium">{facture.statusPayment}</p>
                        </div>
                    </div>

                    {/* Affichage des produits - Plus compact */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-gray-900">Produits commandés</h4>
                        <div className="max-h-[300px] overflow-y-auto border rounded-lg">
                        {facture.order && facture.order.length > 0 ? (
                                facture.order.map((produit: any, index: number) => {
                                    const quantiteCommandee = Number(produit.quantite) || 0;
                                    const quantiteDejaLivree = Number(deliveredQuantities[produit.reference]) || 0;
                                    const quantiteRestante = Math.max(0, quantiteCommandee - quantiteDejaLivree);

                                    return (
                                        <div key={`${produit.reference}-${index}`} className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{produit.designation}</p>
                                                <p className="text-xs text-gray-500">Réf: {produit.reference}</p>
                                                <div className="flex gap-4 mt-1">
                                                    <p className="text-xs text-gray-600">Commandée: {quantiteCommandee}</p>
                                                    <p className="text-xs text-blue-600">Déjà livrée: {quantiteDejaLivree}</p>
                                                    <p className="text-xs text-green-600 font-bold">Restante: {quantiteRestante}</p>
                                                </div>
                                    </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                <Label htmlFor={`qty-${produit.reference}`} className="text-xs text-gray-600">
                                                    Qté à livrer:
                                                </Label>
                                        <Input
                                                    id={`qty-${produit.reference}`}
                                            type="number"
                                            min="0"
                                                    max={quantiteRestante}
                                                    value={quantitesLivrees[produit.reference] || 0}
                                                    onChange={e => handleQuantiteLivreeChange(produit.reference, e.target.value, quantiteRestante)}
                                                    className="w-20 h-8 text-center text-sm"
                                                    disabled={quantiteRestante <= 0 || hasPendingBl}
                                        />
                                    </div>
                                </div>
                                    )
                                })
                        ) : (
                                <div className="text-center text-gray-500 p-4">Aucun produit</div>
                        )}
                        </div>
                    </div>
                    
                    {/* Section chauffeur et actions - Plus compacte */}
                    <div className="space-y-3">
                    {/* chauffeur */}
                        <div className="flex items-center gap-3">
                            <Label className="text-sm font-medium">Chauffeur:</Label>
                            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                                <SelectTrigger className="w-[250px] h-9">
                                <SelectValue placeholder="Sélectionner un chauffeur" />
                            </SelectTrigger>
                                <SelectContent>
                                {drivers.map((driver) => (
                                    <SelectItem 
                                        key={driver.id} 
                                        value={driver.id.toString()}
                                    >
                                        {driver.firstname} {driver.lastname}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        </div>
                        
                        {/* Message d'information si BL en attente */}
                        {hasPendingBl && (
                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                                <p className="text-yellow-800 text-xs">
                                    <strong>Information :</strong> Un bon de livraison est déjà en attente de confirmation pour cette facture. 
                                    Veuillez attendre sa validation avant de créer un nouveau BL.
                                </p>
                    </div>
                        )}
                        
                    {/* Boutons d'action */}
                        <div className="flex justify-end gap-3 pt-2">
                            <Button 
                                onClick={handleSave} 
                                disabled={loading || hasPendingBl}
                                title={hasPendingBl ? "Un BL est en attente de confirmation" : ""}
                                size="sm"
                            >
                                <Check className="h-4 w-4 mr-1"/>
                                Livraison partielle
                            </Button>
                            <Button 
                                className="hover:bg-green-700 bg-green-600" 
                                onClick={handleValiderLivraison} 
                                disabled={loading || hasPendingBl}
                                title={hasPendingBl ? "Un BL est en attente de confirmation" : ""}
                                size="sm"
                            >
                                <CheckCheck className="h-4 w-4 mr-1"/>
                                Livraison complète
                            </Button>
                    </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}   
