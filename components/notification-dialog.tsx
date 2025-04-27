"use client"

import { memo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Calendar as CalendarIcon } from "lucide-react"
import { AlertDialogFooter } from "./ui/alert-dialog"
import { Checkbox } from "./ui/checkbox"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface NotificationDialogProps {
  invoiceId: string;
}

function NotificationDialogComponent({ invoiceId }: NotificationDialogProps) {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [message, setMessage] = useState("")
  const [autoReminder, setAutoReminder] = useState(false)

  const handleSubmit = () => {
    // TODO: Implémenter la logique d'envoi de notification
    console.log({
      invoiceId,
      date,
      message,
      autoReminder
    })
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
          <PopoverContent className="w-auto p-0" align="start">
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

      <div className="flex items-center space-x-2">
        <Checkbox 
          id="auto-reminder" 
          checked={autoReminder}
          onCheckedChange={(checked) => setAutoReminder(checked as boolean)}
        />
        <Label htmlFor="auto-reminder">
          Activer les rappels automatiques
        </Label>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <p>Cette notification sera visible pour tous les utilisateurs qui suivent cette facture.</p>
      </div>

      <AlertDialogFooter>
        <Button variant="outline" type="button">
          Annuler
        </Button>
        <Button onClick={handleSubmit}>
          Créer la notification
        </Button>
      </AlertDialogFooter>
    </div>
  )
}
export default memo(NotificationDialogComponent)
