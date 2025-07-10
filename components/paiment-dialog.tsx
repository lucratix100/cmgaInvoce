'use client'

import { DialogContent, DialogHeader, DialogTitle, DialogDescription, Dialog, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { AlertDialogFooter } from "./ui/alert-dialog"
import { CheckCircle2, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { addPayment } from "@/actions/payment"
import { getInvoiceDetails } from "@/actions/invoice-details"
import { getInvoiceByNumber, getInvoiceWithPayments } from "@/actions/invoice"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { PaymentMethod } from "@/types/enums"

interface PaimentDialogProps {
  invoiceNumber?: string;
}

export default function PaimentDialog({ invoiceNumber }: PaimentDialogProps) {
  console.log({ invoiceNumber })
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [remainingAmount, setRemainingAmount] = useState<number>(0);
  const [formData, setFormData] = useState({
    montant: '',
    modePaiement: 'Espece',
    datePaiement: new Date().toISOString().split('T')[0],
    commentaire: '',
    chequeInfo: ''
  });
  const router = useRouter();

  // Fonction pour récupérer les informations de la facture et calculer le montant restant
  const fetchInvoiceDetails = async () => {
    if (!invoiceNumber) return;

    try {
      setInvoiceLoading(true);

      // Utiliser la nouvelle fonction qui récupère tout en une fois
      const result = await getInvoiceWithPayments(invoiceNumber);
      console.log('Résultat complet:', result);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      const { remainingAmount, totalTTC, totalPaid } = result;

      console.log('Total TTC:', totalTTC);
      console.log('Total payé:', totalPaid);
      console.log('Montant restant:', remainingAmount);

      setRemainingAmount(remainingAmount || 0);

      // Pré-remplir le montant avec le montant restant seulement s'il y en a un
      if (remainingAmount && remainingAmount > 0) {
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

  // Récupérer les détails de la facture quand le dialogue s'ouvre
  useEffect(() => {
    if (isOpen && invoiceNumber) {
      fetchInvoiceDetails();
    }
  }, [isOpen, invoiceNumber]);

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

      const result = await addPayment(invoiceNumber, {
        montant: parseFloat(formData.montant),
        modePaiement: formData.modePaiement as PaymentMethod,
        datePaiement: formData.datePaiement,
        commentaire: formData.commentaire,
        chequeInfo: formData.chequeInfo
      });

      console.log("Paiement enregistré:", result);
      toast.success("Paiement enregistré avec succès");
      resetForm();
      setIsOpen(false);

      // Forcer une mise à jour complète de la page
      window.location.reload();
    } catch (error: any) {
      console.error("Erreur lors de l'enregistrement du paiement:", error);
      toast.error(error.message || "Erreur lors de l'enregistrement du paiement");
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="default" className="bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Enregistrer un paiement
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
          <DialogDescription>
            Enregistrez un paiement pour la facture <span className="font-bold text-primary-500">{invoiceNumber}</span>
          </DialogDescription>
          {!invoiceLoading && (
            <div className="mt-2 text-sm">
              {remainingAmount > 0 ? (
                <span className="text-gray-600">
                  Montant restant à payer : <span className="font-semibold text-green-600">{remainingAmount.toLocaleString('fr-FR')} FCFA</span>
                </span>
              ) : (
                <span className="text-orange-600">
                  ⚠️ Cette facture semble déjà entièrement payée (montant restant : 0 FCFA)
                </span>
              )}
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
            {invoiceLoading && (
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
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Enregistrer le paiement
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </DialogContent>
    </Dialog>
  )
}