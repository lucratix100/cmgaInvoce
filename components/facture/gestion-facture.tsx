'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Check, CheckCheck, Loader2, Truck, User, Edit } from "lucide-react"
import { getInvoiceByNumber } from "@/actions/invoice"
import { processDelivery, getBlsByInvoice, updateBl, getBlEditInfo } from "@/actions/invoice"
import { getDrivers } from "@/actions/driver"
import { getUsers } from "@/actions/user"
import { InvoiceStatus } from "@/types/enums"
import { Role } from "@/types/roles"
import { getCurrentUser } from "@/actions/user"

interface GestionFactureProps {
    isOpen: boolean
    onClose: () => void
    numeroFacture: string
    onSave: (produits: Array<{ reference: string, quantiteLivree: number }>) => void
    driverId?: number
    magasinierId?: number
    isSuperviseurMagasin?: boolean
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

export default function GestionFacture({ isOpen, onClose, numeroFacture, onSave, driverId, magasinierId, isSuperviseurMagasin }: GestionFactureProps) {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [facture, setFacture] = useState<Invoice | null>(null)
    const [quantitesLivrees, setQuantitesLivrees] = useState<{ [reference: string]: number }>({})
    const [drivers, setDrivers] = useState<Array<{ id: number, firstname: string, lastname: string, isActive: boolean }>>([])
    const [selectedDriver, setSelectedDriver] = useState<string>("")
    const [hasPendingBl, setHasPendingBl] = useState(false)
    const [deliveredQuantities, setDeliveredQuantities] = useState<{ [reference: string]: number }>({})
    const [magasiniers, setMagasiniers] = useState<Array<{ id: number, firstname: string, lastname: string, role: string, depotId: number }>>([])
    const [selectedMagasinier, setSelectedMagasinier] = useState<string>("")
    const [loadingDrivers, setLoadingDrivers] = useState(false)
    const [loadingMagasiniers, setLoadingMagasiniers] = useState(false)
    const [superviseurMagasin, setSuperviseurMagasin] = useState<{ id: number, firstname: string, lastname: string } | null>(null)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [pendingBl, setPendingBl] = useState<any>(null)
    const [isEditMode, setIsEditMode] = useState(false)
    const [maxQuantitesEdit, setMaxQuantitesEdit] = useState<{ [reference: string]: number }>({})
    const [allBls, setAllBls] = useState<any[]>([])
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
            fetchCurrentUser()
            // Charger les chauffeurs pour les superviseurs magasin ET les magasiniers
            if (isSuperviseurMagasin || currentUser?.role === Role.MAGASINIER) {
            fetchDrivers()
            }
            if (isSuperviseurMagasin) {
                fetchMagasiniers()
            }
        }
    }, [isOpen, numeroFacture, isSuperviseurMagasin, currentUser?.role])

    // Initialiser le chauffeur sélectionné si driverId est fourni
    useEffect(() => {
        if (driverId && drivers.length > 0) {
            setSelectedDriver(driverId.toString())
        }
    }, [driverId, drivers])

    // Charger le superviseur magasin du dépôt
    useEffect(() => {
        const fetchSuperviseurMagasin = async () => {
            if (facture?.depotId) {
                try {
                    const users = await getUsers();
                    const superviseur = users.find((u: any) => u.role === Role.SUPERVISEUR_MAGASIN && u.depotId === facture.depotId);
                    if (superviseur) {
                        setSuperviseurMagasin({ id: superviseur.id, firstname: superviseur.firstname, lastname: superviseur.lastname });
                    } else {
                        setSuperviseurMagasin(null);
                    }
                } catch (e) {
                    setSuperviseurMagasin(null);
                }
            }
        };
        fetchSuperviseurMagasin();
    }, [facture?.depotId]);

    // Charger l'utilisateur actuel
    useEffect(() => {
        const loadCurrentUser = async () => {
            try {
                const user = await getCurrentUser()
                setCurrentUser(user)
            } catch (error) {
                console.error('Erreur lors du chargement de l\'utilisateur:', error)
            }
        }
        loadCurrentUser()
    }, [])

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
            setAllBls(bls);

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
            setLoadingDrivers(true)
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
        } finally {
            setLoadingDrivers(false)
        }
    }

    const fetchMagasiniers = async () => {
        try {
            setLoadingMagasiniers(true)
            const response = await getUsers()
            const magasiniersList = response?.filter((user: any) => user.role === Role.MAGASINIER) || []
            setMagasiniers(magasiniersList)
        } catch (err) {
            console.error('Erreur lors du chargement des magasiniers:', err)
            toast({
                title: "Erreur",
                description: "Impossible de charger les magasiniers",
                variant: "destructive"
            })
        } finally {
            setLoadingMagasiniers(false)
        }
    }

    const fetchCurrentUser = async () => {
        try {
            const user = await getCurrentUser()
            setCurrentUser(user)
        } catch (error) {
            console.error('Erreur lors du chargement de l\'utilisateur:', error)
        }
    }

    const checkPendingBls = async (invoiceNumber: string) => {
        try {
            const bls = await getBlsByInvoice(invoiceNumber)
            const pendingBl = bls.find((bl: any) => bl.status === 'en attente de confirmation')
            setHasPendingBl(!!pendingBl)
            setPendingBl(pendingBl || null)
            
            if (pendingBl) {
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
        if (isNaN(quantite)) quantite = 0
        if (quantite > maxQuantity) quantite = maxQuantity
        if (quantite < 0) quantite = 0
        setQuantitesLivrees(prev => ({ ...prev, [reference]: quantite }))
    }

    const handleSave = async () => {
        try {
            setLoading(true)
            
            // Utiliser driverId s'il est fourni, sinon vérifier selectedDriver
            let finalDriverId = driverId || (selectedDriver ? parseInt(selectedDriver) : undefined)
            let finalMagasinierId = magasinierId || (selectedMagasinier ? parseInt(selectedMagasinier) : undefined)
            
            if (isSuperviseurMagasin) {
                if (!selectedDriver) {
                    toast({
                        title: "Erreur",
                        description: "Veuillez sélectionner un chauffeur",
                        variant: "destructive"
                    })
                    return
                }
                if (!selectedMagasinier) {
                    toast({
                        title: "Erreur",
                        description: "Veuillez sélectionner un magasinier",
                        variant: "destructive"
                    })
                    return
                }
                finalDriverId = parseInt(selectedDriver)
                finalMagasinierId = parseInt(selectedMagasinier)
            } else {
            if (!finalDriverId) {
                console.log("Erreur: Aucun chauffeur sélectionné")
                toast({
                    title: "Erreur",
                    description: "Veuillez sélectionner un chauffeur",
                    variant: "destructive"
                })
                return
                }
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
                finalDriverId,
                finalMagasinierId
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
            
            // Utiliser driverId s'il est fourni, sinon vérifier selectedDriver
            let finalDriverId = driverId || (selectedDriver ? parseInt(selectedDriver) : undefined)
            let finalMagasinierId = magasinierId || (selectedMagasinier ? parseInt(selectedMagasinier) : undefined)
            
            if (isSuperviseurMagasin) {
                if (!selectedDriver) {
                    toast({
                        title: "Erreur",
                        description: "Veuillez sélectionner un chauffeur",
                        variant: "destructive"
                    })
                    return
                }
                if (!selectedMagasinier) {
                    toast({
                        title: "Erreur",
                        description: "Veuillez sélectionner un magasinier",
                        variant: "destructive"
                    })
                    return
                }
                finalDriverId = parseInt(selectedDriver)
                finalMagasinierId = parseInt(selectedMagasinier)
            } else {
            if (!finalDriverId) {
                console.log("Erreur: Aucun chauffeur sélectionné")
                toast({
                    title: "Erreur",
                    description: "Veuillez sélectionner un chauffeur",
                    variant: "destructive"
                })
                return
                }
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
                finalDriverId,
                finalMagasinierId
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
            await fetchFacture()
            setIsEditMode(false)
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

    const handleUpdateBl = async () => {
        if (!pendingBl) return;
        try {
            setLoading(true)
            
            // Utiliser driverId s'il est fourni, sinon vérifier selectedDriver
            let finalDriverId = driverId || (selectedDriver ? parseInt(selectedDriver) : undefined)
            let finalMagasinierId = magasinierId || (selectedMagasinier ? parseInt(selectedMagasinier) : undefined)
            
            if (isSuperviseurMagasin) {
                if (!selectedDriver) {
                    toast({
                        title: "Erreur",
                        description: "Veuillez sélectionner un chauffeur",
                        variant: "destructive"
                    })
                    return
                }
                if (!selectedMagasinier) {
                    toast({
                        title: "Erreur",
                        description: "Veuillez sélectionner un magasinier",
                        variant: "destructive"
                    })
                    return
                }
                finalDriverId = parseInt(selectedDriver)
                finalMagasinierId = parseInt(selectedMagasinier)
            } else {
                if (!finalDriverId) {
                    toast({
                        title: "Erreur",
                        description: "Veuillez sélectionner un chauffeur",
                        variant: "destructive"
                    })
                    return
                }
            }
            
            console.log("Début de la modification du BL:", pendingBl.id)
            
            // Préparer les produits pour la modification
            const productsForUpdate = produitsAffiches.map((produit: any) => {
                const quantiteLivree = quantitesLivrees[produit.reference] !== undefined
                    ? Number(quantitesLivrees[produit.reference])
                    : (produit.quantiteLivree ?? produit.quantite ?? 0);
                return {
                    reference: produit.reference,
                    quantiteLivree,
                    designation: produit.designation || '',
                    quantite: quantiteLivree,
                    prixUnitaire: Number(produit.prixUnitaire) || 0
                }
            })

            console.log("Produits pour modification:", productsForUpdate)

            // Appeler updateBl
            const result = await updateBl(
                pendingBl.id,
                productsForUpdate,
                false, // isCompleteDelivery = false pour modification
                finalDriverId,
                finalMagasinierId
            )

            console.log("Résultat de la modification:", result)

            toast({
                title: "Succès",
                description: result.message || "BL modifié avec succès",
            })
            
            // Recharger les données
            await fetchFacture()
            setIsEditMode(false)
            // Si le BL n'est plus en attente, on sort du mode édition
            if (result.bl && result.bl.status !== 'en attente de confirmation') {
                setIsEditMode(false)
            }
        } catch (err: any) {
            console.error('Erreur lors de la modification:', err)
            toast({
                title: "Erreur",
                description: err.message || "Impossible de modifier le BL",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const canEditBl = () => {
        if (!pendingBl || !currentUser) return false;
        
        // Le BL doit être en attente de confirmation
        if (pendingBl.status !== 'en attente de confirmation') return false;
        
        // Vérifier que l'utilisateur est le créateur du BL
        if (pendingBl.userId === currentUser.id) return true;
        
        // Ou que l'utilisateur est un superviseur magasin du même dépôt
        if (currentUser.role === Role.SUPERVISEUR_MAGASIN && facture?.depotId) {
            return currentUser.depotId === facture.depotId;
        }
        
        return false;
    }

    // Détermination de la liste des produits à afficher
    const produitsAffiches = isEditMode && pendingBl
      ? (typeof pendingBl.products === 'string' ? JSON.parse(pendingBl.products) : pendingBl.products)
      : (facture && facture.order ? facture.order : []);

    // Fonction pour activer le mode édition et initialiser les quantités
    const activerEditionBl = async () => {
        if (pendingBl) {
            const produits = typeof pendingBl.products === 'string' ? JSON.parse(pendingBl.products) : pendingBl.products;
            const initialQuantites: { [reference: string]: number } = {};
            produits.forEach((p: any) => {
                initialQuantites[p.reference] = p.quantiteLivree ?? p.quantite ?? 0;
            });
            setQuantitesLivrees(initialQuantites);
            // Récupérer les quantités max modifiables depuis le backend
            const editInfo = await getBlEditInfo(pendingBl.id)
            const maxQ: { [reference: string]: number } = {}
            editInfo.forEach((info: any) => {
                maxQ[info.reference] = info.quantiteMaxModifiable
            })
            setMaxQuantitesEdit(maxQ)
        }
        setIsEditMode(true);
    }

    // Calcul des quantités déjà livrées (hors BL en attente)
    const quantitesLivreesValidees: { [reference: string]: number } = {};
    if (facture && facture.order && Array.isArray(facture.order)) {
      const blsValides = allBls.filter((bl: any) => bl.status === 'validée' || bl.status === 'livrée');
      console.log('--- BLs validés pour la facture ---', blsValides);
      facture.order.forEach((p: any) => {
        let totalLivree = 0;
        blsValides.forEach((bl: any) => {
          const produitsBl = typeof bl.products === 'string' ? JSON.parse(bl.products) : bl.products;
          console.log('Produits du BL', bl.id, produitsBl);
          const prod = produitsBl.find((bp: any) => bp.reference === p.reference);
          console.log('Produit trouvé pour référence', p.reference, ':', prod);
          if (prod) totalLivree += Number(prod.quantiteLivree !== undefined ? prod.quantiteLivree : (prod.quantite !== undefined ? prod.quantite : 0));
        });
        console.log('Total livré pour', p.reference, ':', totalLivree);
        quantitesLivreesValidees[p.reference] = totalLivree;
      });
      console.log('=== Résumé quantités livrées validées ===', quantitesLivreesValidees);
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
                        {produitsAffiches && produitsAffiches.length > 0 ? (
                                produitsAffiches.map((produit: any, index: number) => {
                                    // Toujours prendre la quantité commandée de la facture
                                    const produitFacture = facture.order.find((p: any) => p.reference === produit.reference);
                                    const quantiteCommandee = produitFacture ? Number(produitFacture.quantite) : 0;
                                    // Déjà livrée = somme des BL validés
                                    const quantiteLivreeDansBLValides = quantitesLivreesValidees[produit.reference] || 0;
                                    // Quantité du BL en attente (hors édition)
                                    let quantiteBLenAttente = 0;
                                    if (pendingBl && !isEditMode) {
                                        const produitsBL = typeof pendingBl.products === 'string' ? JSON.parse(pendingBl.products) : pendingBl.products;
                                        const prodBL = produitsBL.find((bp: any) => bp.reference === produit.reference);
                                        quantiteBLenAttente = prodBL ? Number(prodBL.quantiteLivree ?? prodBL.quantite ?? 0) : 0;
                                    }
                                    // Quantité restante réelle = Commandée - Déjà livrée
                                    const quantiteRestanteReelle = quantiteCommandee - quantiteLivreeDansBLValides;
                                    // Valeur max pour l'input = quantité restante réelle
                                    const maxInput = isEditMode && pendingBl && maxQuantitesEdit[produit.reference] !== undefined
                                        ? maxQuantitesEdit[produit.reference]
                                        : quantiteRestanteReelle;
                                    return (
                                        <div key={`${produit.reference}-${index}`} className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{produit.designation}</p>
                                                <p className="text-xs text-gray-500">Réf: {produit.reference}</p>
                                                <div className="flex gap-4 mt-1">
                                                    <p className="text-xs text-gray-600">Commandée: {quantiteCommandee}</p>
                                                    <p className="text-xs text-blue-600">Déjà livrée: {quantiteLivreeDansBLValides}</p>
                                                    <p className="text-xs text-green-600 font-bold">Restante: {quantiteRestanteReelle < 0 ? 0 : quantiteRestanteReelle}</p>
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
                                                    max={maxInput}
                                                    value={
                                                        quantitesLivrees[produit.reference] !== undefined
                                                            ? quantitesLivrees[produit.reference]
                                                            : (produit.quantiteLivree ?? produit.quantite ?? 0)
                                                    }
                                                    onChange={e => handleQuantiteLivreeChange(produit.reference, e.target.value, maxInput)}
                                                    className="w-20 h-8 text-center text-sm"
                                                    disabled={!isEditMode && (quantiteRestanteReelle <= 0 || (hasPendingBl && !isEditMode))}
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
                    
                    {/* Section chauffeur et magasinier pour superviseur magasinier */}
                    {isSuperviseurMagasin && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Sélection du chauffeur */}
                                <div className="flex items-center gap-3">
                                    <Label className="text-sm font-medium">Chauffeur:</Label>
                                    <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                                        <SelectTrigger className="w-full h-9">
                                            <SelectValue placeholder="Sélectionner un chauffeur" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {loadingDrivers ? (
                                                <SelectItem value="loading" disabled>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Chargement...
                                                </SelectItem>
                                            ) : (
                                                drivers.map((driver) => (
                                                    <SelectItem 
                                                        key={driver.id} 
                                                        value={driver.id.toString()}
                                                    >
                                                        <Truck className="h-4 w-4 mr-2" />
                                                        {driver.firstname} {driver.lastname}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Sélection du magasinier */}
                                <div className="flex flex-col gap-1 flex-1">
                                    <div className="flex items-center gap-3">
                                        <Label className="text-sm font-medium">Magasinier:</Label>
                                        <Select value={selectedMagasinier} onValueChange={setSelectedMagasinier}>
                                            <SelectTrigger className="w-full h-9">
                                                <SelectValue placeholder="Sélectionner un magasinier" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {loadingMagasiniers ? (
                                                    <SelectItem value="loading" disabled>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Chargement...
                                                    </SelectItem>
                                                ) : (
                                                    magasiniers.map((magasinier) => (
                                                        <SelectItem 
                                                            key={magasinier.id} 
                                                            value={magasinier.id.toString()}
                                                        >
                                                            <User className="h-4 w-4 mr-2" />
                                                            {magasinier.firstname} {magasinier.lastname}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                
                                </div>
                            </div>
                        </div>
                    )}  
                    {/* Section chauffeur pour les autres rôles */}
                    {!isSuperviseurMagasin && (
                    <div className="space-y-3">
                        {/* chauffeur */}
                        <div className="flex items-center gap-3">
                            <Label className="text-sm font-medium">Chauffeur:</Label>
                            <Select value={selectedDriver} onValueChange={setSelectedDriver} disabled={!!driverId}>
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
                        </div>
                    )}
                        
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
                        {/* Bouton de modification du BL en attente */}
                        {pendingBl && canEditBl() && !isEditMode && (
                            <Button 
                                onClick={activerEditionBl} 
                                disabled={loading}
                                variant="outline"
                                size="sm"
                                className="border-blue-500 text-blue-600 hover:bg-blue-50"
                            >
                                <Edit className="h-4 w-4 mr-1"/>
                                Modifier le BL
                            </Button>
                        )}
                        {pendingBl && canEditBl() && isEditMode && (
                            <Button 
                                onClick={handleUpdateBl} 
                                disabled={loading}
                                variant="outline"
                                size="sm"
                                className="border-green-500 text-green-600 hover:bg-green-50"
                            >
                                <Check className="h-4 w-4 mr-1"/>
                                Enregistrer les modifications
                            </Button>
                        )}
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
            </DialogContent>
        </Dialog>
    )
}