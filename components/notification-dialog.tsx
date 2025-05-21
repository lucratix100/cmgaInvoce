"use client"

import { memo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Calendar as CalendarIcon } from "lucide-react"
import { AlertDialogFooter } from "./ui/alert-dialog"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { createReminder } from "@/actions/reminder"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"

interface NotificationDialogProps {
  invoiceId: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

function NotificationDialogComponent({ invoiceId, onSuccess, onClose }: NotificationDialogProps) {
  const { user } = useAuth()
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    
    if (!date || !message) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (!user?.id) {
      toast.error("Vous devez être connecté pour créer une notification");
      return;
    }

    try {
      setIsLoading(true);
      await createReminder({
        invoiceId,
        remindAt: date,
        comment: message,
        userId: user.id
      });

      toast.success("Notification créée avec succès");
      setDate(undefined);
      setMessage("");
      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error("Erreur lors de la création:", error);
      toast.error("Erreur lors de la création de la notification");
    } finally {
      setIsLoading(false);
    }
  }

  const handleCancel = () => {
    setDate(undefined);
    setMessage("");
    onClose?.();
  }

  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="date">Date de la notification</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "dd/MM/yyyy") : <span>Sélectionner une date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          placeholder="Entrez votre message de notification..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[100px]"
        />
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <p>Cette notification sera visible pour tous les utilisateurs qui suivent cette facture.</p>
      </div>

      <AlertDialogFooter>
        <Button variant="outline" type="button" onClick={handleCancel} disabled={isLoading}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Création en cours..." : "Créer la notification"}
        </Button>
      </AlertDialogFooter>
    </div>
  )
}

export default memo(NotificationDialogComponent)
