'use client'

import { DialogContent, DialogHeader, DialogTitle, DialogDescription, Dialog, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { AlertDialogFooter } from "./ui/alert-dialog"
import { CheckCircle2, Loader2, Edit } from "lucide-react"
import { useState, useEffect } from "react"
import { addPayment, updatePayment } from "@/actions/payment"
import { getInvoiceDetails } from "@/actions/invoice-details"
import { getInvoiceByNumber, getInvoicePaymentCalculations } from "@/actions/invoice"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { PaymentMethod } from "@/types/enums"
import { useQueryClient } from '@tanstack/react-query'

interface Payment {
  id: number;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  comment: string | null;
  chequeInfo: string | null;
}

interface PaimentDialogProps {
  invoiceNumber?: string;
  payment?: Payment | null; // Paiement à modifier (null pour nouvel enregistrement)
  onSuccess?: () => void; // Callback après succès
  trigger?: React.ReactNode; // Élément déclencheur personnalisé
}

export default function PaimentDialog({ 
  invoiceNumber, 
  payment = null, 
  onSuccess,
  trigger 
}: PaimentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [remainingAmount, setRemainingAmount] = useState<number>(0);
  const [totalTTC, setTotalTTC] = useState<number>(0);
  const [totalPaid, setTotalPaid] = useState<number>(0);
  const [paymentPercentage, setPaymentPercentage] = useState<number>(0);
  const [formData, setFormData] = useState({
    montant: '',
    modePaiement: 'Espece',
    datePaiement: new Date().toISOString().split('T')[0],
    commentaire: '',
    chequeInfo: ''
  });
  const router = useRouter();
  const queryClient = useQueryClient();

  // Déterminer si c'est une modification ou un nouvel enregistrement
  const isEditMode = !!payment;

  // Fonction pour récupérer les informations de la facture et calculer le montant restant
  const fetchInvoiceDetails = async () => {
    if (!invoiceNumber) return;
    
    try {
      setInvoiceLoading(true);
      
      // Utiliser la fonction backend qui calcule tout côté serveur
      const excludePaymentId = isEditMode && payment ? payment.id : undefined;
      const result = await getInvoicePaymentCalculations(invoiceNumber, excludePaymentId);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }

      // Extraire les données calculées côté backend
      const { calculations } = result;
      const { totalTTC, totalPaid, remainingAmount, paymentPercentage } = calculations;

      // Mettre à jour les états avec les données calculées côté backend
      setRemainingAmount(remainingAmount);
      setTotalTTC(totalTTC);
      setTotalPaid(totalPaid);
      setPaymentPercentage(paymentPercentage);

      // Pré-remplir le montant avec le montant restant seulement s'il y en a un ET si c'est un nouvel enregistrement
      if (!isEditMode && remainingAmount > 0) {
        setFormData(prev => ({
          ...prev,
          montant: remainingAmount.toString()
        }));
      }
      
    } catch (error) {
      console.error('Erreur lors de la récupération des détails de la facture:', error);
      toast.error('Erreur lors de la récupération des informations de la facture');
    } finally {
      setInvoiceLoading(false);
    }
  };

  // Initialiser le formulaire avec les données du paiement à modifier
  const initializeFormWithPayment = () => {
    if (payment) {
      setFormData({
        montant: payment.amount.toString(),
        modePaiement: payment.paymentMethod,
        datePaiement: new Date(payment.paymentDate).toISOString().split('T')[0],
        commentaire: payment.comment || '',
        chequeInfo: payment.chequeInfo || ''
      });
    }
  };

  // Récupérer les détails de la facture quand le dialogue s'ouvre
  useEffect(() => {
    if (isOpen && invoiceNumber) {
      fetchInvoiceDetails();
      if (isEditMode) {
        initializeFormWithPayment();
      }
    }
  }, [isOpen, invoiceNumber, isEditMode, payment]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      modePaiement: value
    }));
  };

  const resetForm = () => {
    setFormData({
      montant: '',
      modePaiement: 'Espece',
      datePaiement: new Date().toISOString().split('T')[0],
      commentaire: '',
      chequeInfo: ''
    });
    setRemainingAmount(0);
    setTotalTTC(0);
    setTotalPaid(0);
    setPaymentPercentage(0);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (!invoiceNumber) {
        toast.error("Numéro de facture manquant");
        return;
      }

      if (!formData.montant || parseFloat(formData.montant) <= 0) {
        toast.error("Veuillez entrer un montant valide");
        return;
      }

      if (!formData.datePaiement) {
        toast.error("Veuillez sélectionner une date de paiement");
        return;
      }

      // Validation pour les informations du chèque
      if (formData.modePaiement === PaymentMethod.CHEQUE && !formData.chequeInfo.trim()) {
        toast.error("Veuillez saisir les informations du chèque");
        return;
      }

      if (isEditMode && payment) {
        // Mode modification
        const result = await updatePayment(payment.id, {
          amount: parseFloat(formData.montant),
          paymentMethod: formData.modePaiement as PaymentMethod,
          paymentDate: formData.datePaiement,
          comment: formData.commentaire || undefined,
          chequeInfo: formData.chequeInfo || undefined
        });

        console.log("Paiement modifié:", result);
        toast.success("Paiement modifié avec succès");
      } else {
        // Mode nouvel enregistrement
        const result = await addPayment(invoiceNumber, {
          montant: parseFloat(formData.montant),
          modePaiement: formData.modePaiement as PaymentMethod,
          datePaiement: formData.datePaiement,
          commentaire: formData.commentaire,
          chequeInfo: formData.chequeInfo
        });

        console.log("Paiement enregistré:", result);
        toast.success("Paiement enregistré avec succès");
      }

      // Invalider spécifiquement les données de paiement pour forcer la mise à jour
      console.log('🔄 Invalidation du cache pour:', invoiceNumber);
      queryClient.invalidateQueries({ queryKey: ['payments', invoiceNumber] });
      queryClient.invalidateQueries({ queryKey: ['payment-calculations', invoiceNumber] });
      console.log('✅ Cache invalidé avec succès');

      resetForm();
      setIsOpen(false);
      
      // Appeler le callback de succès immédiatement après l'invalidation
      if (onSuccess) {
        console.log('🔄 Appel du callback onSuccess');
        onSuccess();
      }
    } catch (error: any) {
      console.error(`Erreur lors de ${isEditMode ? 'la modification' : 'l\'enregistrement'} du paiement:`, error);
      toast.error(error.message || `Erreur lors de ${isEditMode ? 'la modification' : 'l\'enregistrement'} du paiement`);
    } finally {
      setLoading(false);
    }
  };

  // Rendu du bouton déclencheur
  const renderTrigger = () => {
    if (trigger) {
      return trigger;
    }
    
    if (isEditMode) {
      return (
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Edit className="h-3 w-3" />
        </Button>
      );
    }
    
    return (
      <Button size="default" className="bg-green-600 hover:bg-green-700">
        <CheckCircle2 className="mr-2 h-4 w-4" />
        Enregistrer un paiement
      </Button>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {renderTrigger()}
      </DialogTrigger>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Modifier le paiement' : 'Enregistrer un paiement'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifiez' : 'Enregistrez'} un paiement pour la facture <span className="font-bold text-primary-500">{invoiceNumber}</span>
          </DialogDescription>
          
          {/* Affichage du montant restant à payer */}
          {!invoiceLoading && (
            <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="space-y-2">
                {/* Montant restant principal */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-800">
                      {isEditMode ? 'Montant restant (hors paiement actuel)' : 'Montant restant à payer'}
                    </span>
                  </div>
                  <div className="text-right">
                    {remainingAmount > 0 ? (
                      <span className="text-lg font-bold text-green-600">
                        {remainingAmount.toLocaleString('fr-FR')} FCFA
                      </span>
                    ) : (
                      <span className="text-lg font-bold text-orange-600">
                        0 FCFA
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Détails de la facture */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-blue-200">
                  <div className="text-xs">
                    <span className="text-gray-600">Total facture:</span>
                    <div className="font-medium text-gray-800">
                      {totalTTC.toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>
                  <div className="text-xs">
                    <span className="text-gray-600">
                      {isEditMode ? 'Autres paiements:' : 'Déjà payé:'}
                    </span>
                    <div className="font-medium text-gray-800">
                      {totalPaid.toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>
                </div>
                
                {/* Barre de progression */}
                <div className="pt-2 border-t border-blue-200">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">Progression du paiement</span>
                    <span className="font-medium text-blue-700">{paymentPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(paymentPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Note explicative pour les modifications */}
                {isEditMode && (
                  <div className="pt-2 border-t border-blue-200">
                    <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                      <span className="font-medium">Note :</span> Le montant restant affiché exclut le paiement en cours de modification pour un calcul plus précis.
                    </div>
                  </div>
                )}
              </div>
              
              {remainingAmount === 0 && !isEditMode && (
                <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>Cette facture semble déjà entièrement payée</span>
                </div>
              )}
            </div>
          )}
          
          {invoiceLoading && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Calcul du montant restant...</span>
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="montant">Montant du paiement (FCFA)</Label>
            <Input
              id="montant"
              name="montant"
              type="text"
              placeholder="Ex: 100.000"
              value={formData.montant ? formData.montant.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""}
              onChange={(e) => {
                const value = e.target.value.replace(/\./g, "");
                setFormData(prev => ({
                  ...prev,
                  montant: value
                }));
              }}
              disabled={loading || invoiceLoading}
              required
            />
            {invoiceLoading && !isEditMode && (
              <p className="text-xs text-blue-600">Calcul du montant restant...</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="datePaiement">Date du paiement</Label>
            <Input
              id="datePaiement"
              name="datePaiement"
              type="date"
              value={formData.datePaiement}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modePaiement">Mode de paiement</Label>
            <Select
              value={formData.modePaiement}
              onValueChange={handleSelectChange}
              disabled={loading}
            >
              <SelectTrigger id="modePaiement">
                <SelectValue placeholder="Sélectionnez un mode de paiement" />
              </SelectTrigger>
              <SelectContent className="bg-white cursor-pointer">
                <SelectItem className="cursor-pointer hover:bg-gray-100" value={PaymentMethod.ESPECE}>Espèces</SelectItem>
                <SelectItem className="cursor-pointer hover:bg-gray-100" value={PaymentMethod.CHEQUE}>Chèque</SelectItem>
                <SelectItem className="cursor-pointer hover:bg-gray-100" value={PaymentMethod.VIREMENT}>Virement</SelectItem>
                <SelectItem className="cursor-pointer hover:bg-gray-100" value={PaymentMethod.MOBILE_MONEY}>Mobile Money</SelectItem>
                <SelectItem className="cursor-pointer hover:bg-gray-100" value={PaymentMethod.RETOUR}>Retour</SelectItem>
                <SelectItem className="cursor-pointer hover:bg-gray-100" value={PaymentMethod.OD}>OD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Champ supplémentaire pour les informations du chèque */}
          {formData.modePaiement === PaymentMethod.CHEQUE && (
            <div className="space-y-2">
              <Label htmlFor="chequeInfo">Informations du chèque *</Label>
              <Textarea
                id="chequeInfo"
                name="chequeInfo"
                placeholder="Numéro de chèque, banque émettrice, date d'émission, etc..."
                value={formData.chequeInfo}
                onChange={handleChange}
                disabled={loading}
                required
                className="min-h-[80px]"
              />
              <p className="text-xs text-gray-500">
                Ex: Chèque n°123456 - Banque BICIS - Émis le 15/12/2024
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="commentaire">Commentaire (optionnel)</Label>
            <Textarea
              id="commentaire"
              name="commentaire"
              placeholder="Commentaire sur le paiement..."
              value={formData.commentaire}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              setIsOpen(false);
            }}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || invoiceLoading}
            className={isEditMode ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? 'Modification...' : 'Enregistrement...'}
              </>
            ) : (
              <>
                {isEditMode ? (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Modifier le paiement
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Enregistrer le paiement
                  </>
                )}
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </DialogContent>
    </Dialog>
  )
}