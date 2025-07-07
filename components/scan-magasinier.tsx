// 'use client'

// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
// import { Button } from "@/components/ui/button"
// import {Settings, Keyboard, ScanBarcode } from "lucide-react"
// import { useState, useEffect, useRef } from "react"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { useToast } from "@/components/ui/use-toast"
// import { Loader2 } from "lucide-react"
// import GestionFacture from "./facture/gestion-facture"
// import { getInvoiceByNumber } from "@/actions/invoice"
// import { InvoiceStatus } from "@/types/enums"

// interface ScanDialogProps {
//     onScan: (result: string) => void;
// }

// export default function ScanDialog({ onScan }: ScanDialogProps) {
//     const [isOpen, setIsOpen] = useState(false)
//     const [scannedValue, setScannedValue] = useState("")
//     const [showActions, setShowActions] = useState(false)
//     const [showGestion, setShowGestion] = useState(false)
//     const [isTestMode, setIsTestMode] = useState(false)
//     const [dots, setDots] = useState('')
//     const [loading, setLoading] = useState(false)
//     const [errorMessage, setErrorMessage] = useState("")
//     const inputRef = useRef<HTMLInputElement>(null)
//     const { toast } = useToast()

//     useEffect(() => {
//         if (isOpen && inputRef.current) {
//             inputRef.current.focus()
//         }
//     }, [isOpen])

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
//         if (scannedValue.trim() && !loading && !showGestion) {
//             // Attendre un court délai pour s'assurer que le scan est complet
//             const timer = setTimeout(() => {
//                 if (scannedValue.trim()) {
//                     handleScan()
//                 }
//             }, 100) // Délai de 100ms pour laisser le temps au scanner de terminer
            
//             return () => clearTimeout(timer)
//         }
//     }, [scannedValue])

//     const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
//         if (e.key === 'Enter') {
//             e.preventDefault()
//             if (scannedValue.trim()) {
//                 await handleScan()
//             }
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

//             // Vérifier que la facture est en "en attente de livraison" ou "en cours de livraison"
//             if (response.invoice.status !== InvoiceStatus.EN_ATTENTE && response.invoice.status !== InvoiceStatus.EN_COURS) {
//                 setErrorMessage("Cette facture n'est pas en attente de livraison ou en cours de livraison. Seules ces factures peuvent être gérées.")
//                 return
//             }

//             // Facture valide, ouvrir directement le dialogue de gestion
//             setShowGestion(true)
            
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

//     const handleClose = () => {
//         setIsOpen(false)
//         setShowActions(false)
//         setShowGestion(false)
//         setScannedValue("")
//         setIsTestMode(false) // Ajouté pour réinitialiser le mode test
//         setErrorMessage("")
//         setLoading(false)
//     }

//     const handleGestion = () => {
//         setShowGestion(true)
//     }




//     const handleSaveGestion = (produits: Array<{ reference: string, quantiteLivree: number }>) => {
//         handleClose()
//     }

//     const handleTestMode = () => {
//         setIsTestMode(true)
//         if (inputRef.current) {
//             inputRef.current.focus()
//         }
//     }

//     return (
//         <>
//             <Dialog open={isOpen} onOpenChange={setIsOpen}>
//                 <DialogTrigger asChild>
//                     <Button 
//                         variant="outline" 
//                         className="hover:bg-primary-700 hover:text-white bg-primary-500 text-white transition-all duration-300"
//                         onClick={() => setIsOpen(true)}
//                     >
//                         <ScanBarcode className="h-4 w-4 mr-2" />
//                         Scanner la facture
//                     </Button>
//                 </DialogTrigger>
//                 <DialogContent className="sm:max-w-[425px]">
//                     <DialogHeader>
//                         <DialogTitle>Scanner le numéro de facture</DialogTitle>
//                     </DialogHeader>
//                     <div className="py-4 space-y-4">
//                         <div className="space-y-2">
//                             <Label htmlFor="scanner-input">Scannez le code-barres</Label>
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
//                         <div className="space-y-4">
//                             <div className="text-sm text-gray-500 text-center">
//                                 <p>Scannez le code-barres de la facture</p>
//                             </div>
//                             <Button
//                                 variant="outline"
//                                 onClick={handleTestMode}
//                                 className="w-full"
//                                 disabled={loading}
//                             >
//                                 <Keyboard className="h-4 w-4 mr-2" />
//                                 Mode test (saisie manuelle)
//                             </Button>
//                         </div>
//                     </div>
//                 </DialogContent>
//             </Dialog>

//             <GestionFacture
//                 isOpen={showGestion}
//                 onClose={() => setShowGestion(false)}
//                 numeroFacture={scannedValue}
//                 onSave={handleSaveGestion}
//             />
//         </>
//     )
// }
