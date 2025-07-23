import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { PaymentMethod } from "@/types/enums";
import { addPayment } from "@/actions/payment";
import { toast } from "@/components/ui/use-toast";
import { Invoice } from "@/lib/types";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface PaiementInlineFormProps {
  facture: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedFacture: Invoice) => void;
  montantPaye: number;
}

const PaiementInlineForm: React.FC<PaiementInlineFormProps> = ({ facture, isOpen, onClose, onSuccess, montantPaye }) => {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.ESPECE);
  const [paymentComment, setPaymentComment] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const montantInputRef = useRef<HTMLInputElement>(null);
  const paymentRowRef = useRef<HTMLTableCellElement>(null);
  const [selectOpen, setSelectOpen] = useState(false);
  // Champ pour l'information du chèque
  const [chequeInfo, setChequeInfo] = useState("");

  // Focus et pré-remplissage
  useEffect(() => {
    if (isOpen && montantInputRef.current) {
      montantInputRef.current.focus();
      setPaymentAmount(facture.remainingAmount.toString());
    }
  }, [isOpen, facture.remainingAmount]);

  // Clic extérieur
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (selectOpen) return; // Ne pas fermer si le select est ouvert
      if (paymentRowRef.current && !paymentRowRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, selectOpen]);

  // Progression globale
  const progression = Math.round((1 - facture.remainingAmount / facture.totalTtc) * 100);

  const formatMontantInput = (value: string) => {
    // On enlève tout sauf chiffres et séparateur décimal
    let clean = value.replace(/[^\d.,]/g, "");
    // On remplace la virgule par un point pour la conversion
    clean = clean.replace(",", ".");
    // On limite à 2 décimales
    const [intPart, decPart] = clean.split(".");
    let formatted = Number(intPart || 0).toLocaleString();
    if (decPart !== undefined) {
      formatted += "," + decPart.slice(0, 2);
    }
    return formatted;
  };

  return (
    <tr className="bg-gradient-to-r from-primary-50/80 to-blue-50/60 hover:from-primary-100/90 hover:to-blue-100/70 transition-all duration-300 ring-2 ring-primary-400 shadow-2xl relative z-20">
      <td
        ref={paymentRowRef}
        colSpan={100}
        className="py-3 relative w-full bg-blue-50"
        style={{ width: "100%" }}
      >
        <div className="flex flex-col w-full">
          {/* Montants */}
          <div className="flex flex-wrap gap-6 items-center justify-between mb-2 px-2 text-xs w-full">
            <span className="text-primary-700 font-medium">
              <span className="font-bold text-base text-primary-900">Total : {facture.totalTtc.toLocaleString()} FCFA</span>
            </span>
            <span className="text-green-700 font-medium">
              Payé : <span className="font-bold">{montantPaye.toLocaleString()} FCFA</span>
            </span>
            <span className="text-primary-700 font-medium">
              Restant : <span className="font-bold">{facture.remainingAmount.toLocaleString()} FCFA</span>
            </span>
            <span className="text-gray-500">Progression : {progression}%</span>
          </div>
          {/* Formulaire */}
          <form
            className="flex flex-row flex-wrap gap-3 items-center w-full"
            style={{ width: "100%" }}
            onClick={e => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              setErrorMsg("");
              if (!paymentAmount || !paymentMethod) {
                setErrorMsg("Champs obligatoires");
                return;
              }
              setIsPaying(true);
              try {
                const updatedFacture = await addPayment(facture.invoiceNumber, {
                  montant: Number(paymentAmount),
                  modePaiement: paymentMethod as PaymentMethod,
                  datePaiement: new Date().toISOString(),
                  commentaire: paymentComment,
                  chequeInfo: paymentMethod === PaymentMethod.CHEQUE ? chequeInfo : undefined
                });
                toast({ title: "Paiement ajouté", description: "Le paiement a bien été enregistré." });
                setSuccess(true);
                if (onSuccess) onSuccess(updatedFacture);
                setTimeout(() => { setSuccess(false); onClose(); }, 1200);
              } catch (err) {
                setErrorMsg("Erreur lors de l'ajout");
              } finally {
                setIsPaying(false);
              }
            }}
          >
            <Input
              ref={montantInputRef}
              type="text"
              inputMode="decimal"
              min="0"
              max={facture.remainingAmount}
              className="ml-2 rounded-[7px] bg-white border-2 border-primary-200 px-4 py-3 w-48 text-base focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all duration-200 shadow-sm hover:shadow-md"
              placeholder="Montant"
              value={formatMontantInput(paymentAmount)}
              onChange={e => {
                // On garde la valeur brute pour le calcul, mais on affiche formaté
                const raw = e.target.value.replace(/[^\d.,]/g, "").replace(",", ".");
                setPaymentAmount(raw);
              }}
              required
              disabled={isPaying}
            />
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              disabled={isPaying}
              required
              open={selectOpen}
              onOpenChange={setSelectOpen}
            >
              <SelectTrigger className="rounded-[7px] bg-white border-2 border-primary-200 px-4 py-3 w-52 text-base focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all duration-200 shadow-sm hover:shadow-md">
                <SelectValue placeholder="Mode de paiement" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PaymentMethod).map((pm) => (
                  <SelectItem key={pm} value={pm}>{pm}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Afficher le champ chèque si le mode de paiement est CHEQUE */}
            {paymentMethod === PaymentMethod.CHEQUE && (
              <Input
                type="text"
                className="rounded-[7px] bg-white border-2 border-primary-200 px-4 py-3 w-64 text-base focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="Informations du chèque (numéro, banque, etc.)"
                value={chequeInfo}
                onChange={e => setChequeInfo(e.target.value)}
                disabled={isPaying}
                required
              />
            )}
            <Input
              type="text"
              className="rounded-[7px] bg-white border-2 border-primary-200 px-4 py-3 w-64 text-base focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all duration-200 shadow-sm hover:shadow-md"
              placeholder="Commentaire (optionnel)"
              value={paymentComment}
              onChange={e => setPaymentComment(e.target.value)}
              disabled={isPaying}
            />
            <Button 
              type="submit" 
              size="sm" 
              className="rounded-full bg-gradient-to-r from-primary-600 to-blue-600 text-white px-6 py-2 text-sm font-semibold hover:from-primary-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105" 
              disabled={isPaying}
            >
              {isPaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Valider
            </Button>
            <Button 
              type="button" 
              size="sm" 
              variant="ghost" 
              className="rounded-full text-gray-500 hover:text-primary-700 px-4 py-2 text-sm transition-all duration-200 hover:bg-gray-100" 
              onClick={onClose} 
              disabled={isPaying}
            >
              <XCircle className="w-4 h-4" /> Annuler
            </Button>
            {errorMsg && <span className="text-xs text-red-600 ml-2 flex items-center animate-pulse"><XCircle className="w-3 h-3 mr-1" /> {errorMsg}</span>}
            {success && <span className="text-xs text-green-600 ml-2 flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> Ajouté !</span>}
          </form>
        </div>
        {/* Barre de progression verte globale */}
        <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
            style={{ width: `${progression}%` }}
          />
        </div>
      </td>
    </tr>
  );
};

export default PaiementInlineForm; 