"use client"

import { memo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Calendar as CalendarIcon } from "lucide-react"
import { AlertDialogFooter } from "./ui/alert-dialog"
import { format, isBefore, startOfDay } from "date-fns"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { createReminder } from "@/actions/reminder"
import { toast } from "sonner"


interface NotificationDialogProps {
  invoiceId: number;
  onSuccess?: () => void;
  onClose?: () => void;
  user: {
    id: number;
    email: string;
    firstname: string;
    lastname: string;
    role: string;
  };
}

function NotificationDialogComponent({ invoiceId, onSuccess, onClose, user }: NotificationDialogProps) {
  console.log(invoiceId, "invoiceId")
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ date?: string; message?: string }>({})

  const validateForm = () => {
    const newErrors: { date?: string; message?: string } = {}
    console.log(user, "validateForm")
    if (!date) {
      newErrors.date = "La date est obligatoire"
    } else if (isBefore(date, startOfDay(new Date()))) {
      newErrors.date = "La date ne peut pas être dans le passé"
    }

    if (!message.trim()) {
      newErrors.message = "Le message est obligatoire"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    console.log("handleSubmit")
    try {
      if (!validateForm()) {
        console.log("Erreurs de validation:", errors)
        return
      }

      if (!user?.id) {
        console.log("Vous devez être connecté pour créer une notification")
        return
      }

      setIsLoading(true)

      // Formatage de la date pour l'API
      const formattedDate = date ? new Date(date.setHours(0, 0, 0, 0)) : undefined

      await createReminder({
        invoiceId,
        remindAt: formattedDate!,
        comment: message,
      })

      toast.success("Notification créée avec succès")
      setDate(undefined)
      setMessage("")
      setErrors({})
      onSuccess?.()
      onClose?.()
    } catch (error: any) {
      console.error("Erreur détaillée:", error)
      toast.error(error.message || "Erreur lors de la création de la notification")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (date || message) {
      if (window.confirm("Voulez-vous vraiment annuler ? Les données saisies seront perdues.")) {
        setDate(undefined)
        setMessage("")
        setErrors({})
        onClose?.()
      }
    } else {
      onClose?.()
    }
  }

  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="date" className="flex items-center gap-1">
          Date de la notification
          <span className="text-red-500">*</span>
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground",
                errors.date && "border-red-500"
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
              disabled={(date) => isBefore(date, startOfDay(new Date()))}
            />
          </PopoverContent>
        </Popover>
        {errors.date && (
          <p className="text-sm text-red-500">{errors.date}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="message" className="flex items-center gap-1">
          Message
          <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="message"
          placeholder="Entrez votre message de notification..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={cn(
            "min-h-[100px]",
            errors.message && "border-red-500"
          )}
        />
        {errors.message && (
          <p className="text-sm text-red-500">{errors.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <p>Cette notification sera visible pour tous les utilisateurs qui suivent cette facture.</p>
      </div>

      <AlertDialogFooter>
        <Button variant="outline" type="button" onClick={handleCancel} disabled={isLoading}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? "Création en cours..." : "Créer la notification"}
        </Button>
      </AlertDialogFooter>
    </div>
  )
}

export default memo(NotificationDialogComponent)
