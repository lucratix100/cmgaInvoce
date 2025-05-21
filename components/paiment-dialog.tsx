'use client'

import { DialogContent, DialogHeader, DialogTitle, DialogDescription, Dialog, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { AlertDialogFooter } from "./ui/alert-dialog"
import { CheckCircle2, Loader2 } from "lucide-react"
import { useState } from "react"
import { addPayment } from "@/actions/payment"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { PaymentMethod } from "@/types/enums"

interface PaimentDialogProps {
  invoiceNumber?: string;
}

export default function PaimentDialog({ invoiceNumber }: PaimentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    montant: '',
    modePaiement: 'Espece',
    datePaiement: new Date().toISOString().split('T')[0],
    commentaire: ''
  });
  const router = useRouter();

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
      commentaire: ''
    });
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

      const result = await addPayment(invoiceNumber, {
        montant: parseFloat(formData.montant),
        modePaiement: formData.modePaiement as PaymentMethod,
        datePaiement: formData.datePaiement,
        commentaire: formData.commentaire
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
                handleChange({
                  target: {
                    name: "montant",
                    value: value
                  }
                });
              }}
              disabled={loading}
              required
            />
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
            disabled={loading}
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