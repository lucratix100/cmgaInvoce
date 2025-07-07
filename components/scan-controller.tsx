// 'use client'

// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { useState, useEffect, useRef } from "react"
// import { useToast } from "@/components/ui/use-toast"
// import { Loader2, Check, ScanBarcode, Keyboard, Package, User, Calendar, X } from "lucide-react"
// import { getInvoiceByNumber, getBlsByInvoice, confirmBl } from "@/actions/invoice"
// import { InvoiceStatus } from "@/types/enums"
// import { useActivityInvalidation } from "@/hooks/useActivityInvalidation"

// interface ScanControllerProps {
//     onScan?: (result: string) => void;
// }

// interface InvoiceProduct {
//     reference: string
//     designation: string
//     quantite: number
//     prixUnitaire: number
//     total: number
// }

// interface Invoice {
//     id: number
//     invoiceNumber: string
//     accountNumber: string
//     date: string
//     status: string
//     isCompleted: boolean
//     isCompleteDelivery: boolean
//     order: InvoiceProduct[]
//     customer: {
//         id: number
//         name: string
//         phone: string
//     } | null
//     depotId: number
//     totalTtc: number
//     statusPayment: string
// }

// interface Bl {
//     id: number
//     status: string
//     products: any[]
//     total: number
//     createdAt: string
//     driver?: {
//         firstname: string
//         lastname: string
//     }
// }

// export default function ScanController({ onScan }: ScanControllerProps) {
//     const [isOpen, setIsOpen] = useState(false)
//     const [scannedValue, setScannedValue] = useState("")
//     const [isTestMode, setIsTestMode] = useState(false)
//     const [dots, setDots] = useState('')
//     const [loading, setLoading] = useState(false)
//     const [errorMessage, setErrorMessage] = useState("")
//     const [invoiceData, setInvoiceData] = useState<Invoice | null>(null)
//     const [pendingBls, setPendingBls] = useState<Bl[]>([])
//     const [confirmingBl, setConfirmingBl] = useState(false)
//     const inputRef = useRef<HTMLInputElement>(null)
//     const { toast } = useToast()
//     const { invalidateAfterAction } = useActivityInvalidation()

//     const formatAmount = (amount: number) => {
//         return new Intl.NumberFormat('fr-FR', {
//             style: 'currency',
//             currency: 'XOF'
//         }).format(amount)
//     }

//     useEffect(() => {
//         if (isOpen && !isTestMode) {
//             inputRef.current?.focus()
//         }
//     }, [isOpen, isTestMode])

//     useEffect(() => {
//         if (!isTestMode && isOpen && !scannedValue) {
//             const interval = setInterval(() => {
//                 setDots(d => d.length < 3 ? d + '.' : '');
//             }, 500);
//             return () => clearInterval(interval);
//         } else {
//             setDots('');
//         }
//     }, [isTestMode, isOpen, scannedValue]);

//     // Effet pour détecter automatiquement un scan complet
//     useEffect(() => {
//         if (scannedValue.trim() && !loading) {
//             // Attendre un court délai pour s'assurer que le scan est complet
//             const timer = setTimeout(() => {
//                 if (scannedValue.trim()) {
//                     handleScan()
//                 }
//             }, 100) // Délai de 100ms pour laisser le temps au scanner de terminer
            
//             return () => clearTimeout(timer)
//         }
//     }, [scannedValue])

//     const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
//         if (e.key === 'Enter' && scannedValue.trim()) {
//             e.preventDefault()
//             handleScan()
//         }
//     }

//     const handleScan = async () => {
//         if (!scannedValue.trim()) {
//             setErrorMessage("Veuillez entrer un numéro de facture")
//             return
//         }

//         try {
//             setLoading(true)
//             setErrorMessage("")
            
//             const response = await getInvoiceByNumber(scannedValue)
            
//             if (response.error) {
//                 setErrorMessage(response.error)
//                 return
//             }
            
//             if (!response || !response.invoice) {
//                 setErrorMessage("Facture non trouvée")
//                 return
//             }

//             // Vérifier que la facture est en cours de livraison
//             if (response.invoice.status !== InvoiceStatus.EN_COURS) {
//                 setErrorMessage("Cette facture n'est pas en cours de livraison. Seules les factures en cours de livraison peuvent être confirmées.")
//                 return
//             }

//             setInvoiceData(response.invoice)
            
//             // Récupérer les BLs de la facture
//             const bls = await getBlsByInvoice(scannedValue)
//             const pending = bls.filter((bl: Bl) => bl.status === 'en attente de confirmation')
//             setPendingBls(pending)
            
//         } catch (error: any) {
//             console.error('Erreur lors du scan:', error)
//             if (error.message) {
//                 setErrorMessage(error.message)
//             } else {
//                 setErrorMessage("Une erreur est survenue lors du scan de la facture")
//             }
//         } finally {
//             setLoading(false)
//         }
//     }

//     const handleConfirmBl = async (blId: number) => {
//         if (!invoiceData) return;
        
//         try {
//             setConfirmingBl(true)
            
//             const result = await confirmBl(invoiceData.invoiceNumber)
            
//             // Invalider automatiquement les activités récentes après une confirmation
//             invalidateAfterAction('confirmation_livraison')
            
//             toast({ 
//                 title: "Succès", 
//                 description: result.message || "BL confirmé avec succès !" 
//             })
            
//             // Si la facture est maintenant livrée, fermer le dialogue
//             if (
//                 result.message &&
//                 (result.message.includes("Facture livrée") ||
//                     result.message.includes("Facture soldée"))
//             ) {
//                 resetDialog();
//                 if (onScan) onScan(invoiceData.invoiceNumber);
//                 return;
//             }
            
//             // Sinon, recharger seulement les données du dialogue
//             await handleScan()
            
//         } catch (err: any) {
//             console.error('Erreur lors de la confirmation:', err)
//             toast({ 
//                 title: "Erreur", 
//                 description: err.message || "Impossible de confirmer le BL", 
//                 variant: "destructive" 
//             })
//         } finally {
//             setConfirmingBl(false)
//         }
//     }

//     const resetDialog = () => {
//         setScannedValue("");
//         setIsTestMode(false);
//         setErrorMessage("");
//         setLoading(false);
//         setInvoiceData(null);
//         setPendingBls([]);
//         setConfirmingBl(false);
//         if (inputRef.current) {
//             inputRef.current.focus();
//         }
//     };

//     const handleClose = () => {
//         setIsOpen(false);
//         resetDialog();
//     };

//     const handleTestMode = () => {
//         setIsTestMode(true)
//         if (inputRef.current) {
//             inputRef.current.focus()
//         }
//     }

//     return (
//         <>
//             <Dialog open={isOpen} onOpenChange={(open) => {
//                 if (!open) {
//                     handleClose()
//                 } else {
//                     setIsOpen(true)
//                 }
//             }}>
//                 <DialogTrigger asChild>
//                     <Button 
//                         variant="outline" 
//                         className="hover:bg-primary-700 hover:text-white bg-primary-500 text-white transition-all duration-300"
//                         onClick={() => setIsOpen(true)}
//                     >
//                         <ScanBarcode className="h-4 w-4 mr-2" />
//                         Scanner pour confirmer
//                     </Button>
//                 </DialogTrigger>
//                 <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
//                     <DialogHeader>
//                         <DialogTitle className="flex justify-between items-center">
//                             Scanner une facture pour confirmation
//                             <Button
//                                 variant="ghost"
//                                 size="icon"
//                                 onClick={handleClose}
//                                 className="rounded-full"
//                             >
//                                 <X className="h-4 w-4" />
//                             </Button>
//                         </DialogTitle>
//                     </DialogHeader>
//                     <div className="py-4 space-y-4">
//                         <div className="space-y-2">
//                             <Label htmlFor="scanner-input">Scannez le code-barres de la facture</Label>
//                             <Input
//                                 ref={inputRef}
//                                 id="scanner-input"
//                                 value={scannedValue}
//                                 onChange={(e) => setScannedValue(e.target.value)}
//                                 onKeyDown={handleKeyDown}
//                                 // readOnly={!isTestMode || loading}
//                                 className="text-center text-lg font-medium"
//                                 placeholder={isTestMode ? "Saisissez le numéro de facture..." : `En attente du scan${dots}`}
//                             />
//                             {errorMessage && (
//                                 <p className="text-sm text-red-500 text-center">{errorMessage}</p>
//                             )}
//                         </div>

//                         {!invoiceData ? (
//                             <div className="space-y-4">
//                                 <div className="text-sm text-gray-500 text-center">
//                                     <p>Scannez le code-barres d'une facture en cours de livraison</p>
//                                 </div>
//                                 <Button
//                                     variant="outline"
//                                     onClick={handleTestMode}
//                                     className="w-full"
//                                     disabled={loading}
//                                 >
//                                     <Keyboard className="h-4 w-4 mr-2" />
//                                     Mode test (saisie manuelle)
//                                 </Button>
//                             </div>
//                         ) : (
//                             <div className="space-y-6">
//                                 {/* Informations de la facture */}
//                                 <div className="bg-blue-50 p-4 rounded-lg">
//                                     <div className="flex items-center justify-between mb-4">
//                                         <h3 className="text-lg font-semibold text-blue-900">Facture {invoiceData.invoiceNumber}</h3>
//                                         <div className="flex gap-2">
//                                             <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
//                                                 {invoiceData.status}
//                                             </span>
//                                         </div>
//                                     </div>
                                    
//                                     {/* Informations principales */}
//                                     <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
//                                         <div className="space-y-2">
//                                             <div className="flex items-center gap-2">
//                                                 <User className="h-4 w-4 text-blue-600" />
//                                                 <span className="text-blue-700 font-medium">Client:</span>
//                                                 <span className="text-blue-800">{invoiceData.customer?.name || 'Non spécifié'}</span>
//                                             </div>
//                                             <div className="flex items-center gap-2">
//                                                 <span className="text-blue-700 font-medium">N° Compte:</span>
//                                                 <span className="text-blue-800">{invoiceData.accountNumber}</span>
//                                             </div>
//                                             {invoiceData.customer?.phone && (
//                                                 <div className="flex items-center gap-2">
//                                                     <span className="text-blue-700 font-medium">Téléphone:</span>
//                                                     <span className="text-blue-800">{invoiceData.customer.phone}</span>
//                                                 </div>
//                                             )}
//                                         </div>
//                                         <div className="space-y-2">
//                                             <div className="flex items-center gap-2">
//                                                 <Calendar className="h-4 w-4 text-blue-600" />
//                                                 <span className="text-blue-700 font-medium">Date:</span>
//                                                 <span className="text-blue-800">{new Date(invoiceData.date).toLocaleDateString('fr-FR')}</span>
//                                             </div>
//                                             <div className="flex items-center gap-2">
//                                                 <span className="text-blue-700 font-medium">Montant TTC:</span>
//                                                 <span className="text-blue-800 font-semibold">{formatAmount(invoiceData.totalTtc)}</span>
//                                             </div>
//                                         </div>
//                                     </div>

//                                     {/* Produits commandés */}
//                                     <div className="border-t border-blue-200 pt-4">
//                                         <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
//                                             <Package className="h-4 w-4" />
//                                             Produits commandés ({invoiceData.order.length})
//                                         </h4>
//                                         <div className="max-h-40 overflow-y-auto space-y-2">
//                                             {invoiceData.order.map((product, index) => (
//                                                 <div key={`${product.reference}-${index}`} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-blue-200">
//                                                     <div className="flex-1 min-w-0">
//                                                         <p className="font-medium text-blue-900 truncate">{product.designation}</p>
//                                                         <p className="text-xs text-blue-600">Réf: {product.reference}</p>
//                                                     </div>
//                                                     <div className="flex items-center gap-4 text-right">
//                                                         <div>
//                                                             <p className="text-xs text-blue-600">Quantité</p>
//                                                             <p className="font-medium text-blue-900">{product.quantite}</p>
//                                                         </div>
//                                                         <div>
//                                                             <p className="text-xs text-blue-600">Prix unit.</p>
//                                                             <p className="font-medium text-blue-900">{formatAmount(product.prixUnitaire)}</p>
//                                                         </div>
//                                                         <div>
//                                                             <p className="text-xs text-blue-600">Total</p>
//                                                             <p className="font-medium text-blue-900">{formatAmount(product.total)}</p>
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </div>
//                                 </div>

//                                 {/* BLs en attente de confirmation */}
//                                 {pendingBls.length > 0 ? (
//                                     <div className="space-y-4">
//                                         <h4 className="font-medium text-gray-900">BLs en attente de confirmation</h4>
//                                         {pendingBls.map((bl) => (
//                                             <div key={bl.id} className="border rounded-lg p-4 bg-yellow-50">
//                                                 <div className="flex items-center justify-between mb-3">
//                                                     <div>
//                                                         <p className="font-medium">BL #{bl.id}</p>
//                                                         <p className="text-sm text-gray-600">
//                                                             Créé le {new Date(bl.createdAt).toLocaleDateString('fr-FR')}
//                                                         </p>
//                                                         {bl.driver && (
//                                                             <p className="text-sm text-gray-600">
//                                                                 Chauffeur: {bl.driver.firstname} {bl.driver.lastname}
//                                                             </p>
//                                                         )}
//                                                     </div>
//                                                     <Button
//                                                         onClick={() => handleConfirmBl(bl.id)}
//                                                         disabled={confirmingBl}
//                                                         className="bg-green-600 hover:bg-green-700"
//                                                     >
//                                                         {confirmingBl ? (
//                                                             <>
//                                                                 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                                                                 Confirmation...
//                                                             </>
//                                                         ) : (
//                                                             <>
//                                                                 <Check className="h-4 w-4 mr-2" />
//                                                                 Confirmer ce BL
//                                                             </>
//                                                         )}
//                                                     </Button>
//                                                 </div>
                                
//                                                 {/* Produits du BL */}
//                                                 <div className="space-y-2">
//                                                     <p className="text-sm font-medium">Produits livrés:</p>
//                                                     <div className="max-h-32 overflow-y-auto">
//                                                         {bl.products.map((product: any, index: number) => (
//                                                             <div key={index} className="flex justify-between text-sm py-1 border-b border-yellow-200 last:border-b-0">
//                                                                 <span>{product.designation || product.reference}</span>
//                                                                 <span className="font-medium">{product.quantite} unités</span>
//                                                             </div>
//                                                         ))}
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 ) : (
//                                     <div className="text-center text-gray-500 py-8">
//                                         <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
//                                         <p>Aucun BL en attente de confirmation pour cette facture</p>
//                                     </div>
//                                 )}
//                             </div>
//                         )}
//                     </div>
//                 </DialogContent>
//             </Dialog>
//         </>
//     )
// }
