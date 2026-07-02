"use client"

import { useMemo, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { transferCommercialResources } from "@/actions/commercial-admin"
import { CommercialUser } from "@/types/commercial"
import { ArrowRightLeft, BriefcaseBusiness, CalendarDays } from "lucide-react"

type CommercialTransferDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  agents: CommercialUser[]
  fromAgentId: string
  portfolioCount: number
  planningCount: number
  defaultTransferPortfolio?: boolean
  defaultTransferPlanning?: boolean
  onSuccess?: (toAgentId: string) => void
}

export default function CommercialTransferDialog({
  open,
  onOpenChange,
  agents,
  fromAgentId,
  portfolioCount,
  planningCount,
  defaultTransferPortfolio = true,
  defaultTransferPlanning = false,
  onSuccess,
}: CommercialTransferDialogProps) {
  const activeAgents = agents.filter((agent) => agent.isActive !== false)
  const fromAgent = activeAgents.find((agent) => String(agent.id) === fromAgentId)
  const destinationOptions = activeAgents.filter((agent) => String(agent.id) !== fromAgentId)

  const [toAgentId, setToAgentId] = useState("")
  const [transferPortfolio, setTransferPortfolio] = useState(defaultTransferPortfolio)
  const [transferPlanning, setTransferPlanning] = useState(defaultTransferPlanning)
  const [note, setNote] = useState("")
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const canSubmit = useMemo(() => {
    if (!fromAgentId || !toAgentId) return false
    if (!transferPortfolio && !transferPlanning) return false
    if (transferPortfolio && portfolioCount === 0 && !transferPlanning) return false
    if (transferPlanning && planningCount === 0 && !transferPortfolio) return false
    return true
  }, [fromAgentId, toAgentId, transferPortfolio, transferPlanning, portfolioCount, planningCount])

  const resetForm = () => {
    setToAgentId("")
    setTransferPortfolio(defaultTransferPortfolio)
    setTransferPlanning(defaultTransferPlanning)
    setNote("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  const submit = () => {
    if (!canSubmit) return

    startTransition(async () => {
      const result = await transferCommercialResources({
        fromAgentId: Number(fromAgentId),
        toAgentId: Number(toAgentId),
        transferPortfolio,
        transferPlanning,
        note: note.trim() || undefined,
      })

      if (!result.success) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" })
        return
      }

      const summary = result.data
      const parts: string[] = []
      if (transferPortfolio && summary) {
        parts.push(
          `${summary.assignmentsTransferred + summary.assignmentsMerged} cible(s) de portefeuille transférée(s)`
        )
        if (summary.assignmentsMerged > 0) {
          parts.push(`${summary.assignmentsMerged} déjà présente(s) chez le destinataire`)
        }
      }
      if (transferPlanning && summary) {
        parts.push(`${summary.planningTransferred} programme(s) transféré(s)`)
        if (summary.planningSkipped > 0) {
          parts.push(`${summary.planningSkipped} ignoré(s) (doublon ou invalide)`)
        }
      }

      toast({
        title: "Transfert effectué",
        description: parts.join(" · ") || "Le transfert a été effectué avec succès.",
      })

      handleOpenChange(false)
      onSuccess?.(toAgentId)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Transférer vers un autre commercial
          </DialogTitle>
          <DialogDescription>
            Déplacez le portefeuille et/ou le planning de{" "}
            <span className="font-medium text-foreground">
              {fromAgent ? `${fromAgent.firstname} ${fromAgent.lastname}` : "ce commercial"}
            </span>{" "}
            vers un autre commercial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Commercial destination</Label>
            <Select value={toAgentId || undefined} onValueChange={setToAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir le commercial destinataire" />
              </SelectTrigger>
              <SelectContent>
                {destinationOptions.map((agent) => (
                  <SelectItem key={agent.id} value={String(agent.id)}>
                    {agent.firstname} {agent.lastname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={transferPortfolio}
                onCheckedChange={(checked) => setTransferPortfolio(checked === true)}
                disabled={portfolioCount === 0}
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BriefcaseBusiness className="h-4 w-4 text-violet-500" />
                  Portefeuille
                </div>
                <p className="text-xs text-muted-foreground">
                  {portfolioCount > 0
                    ? `${portfolioCount} cible(s) seront transférées.`
                    : "Aucune cible dans ce portefeuille."}
                </p>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={transferPlanning}
                onCheckedChange={(checked) => setTransferPlanning(checked === true)}
                disabled={planningCount === 0}
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Planning hebdomadaire
                </div>
                <p className="text-xs text-muted-foreground">
                  {planningCount > 0
                    ? `${planningCount} programme(s) seront déplacés. Les doublons seront ignorés.`
                    : "Aucun programme dans ce planning."}
                </p>
                {transferPlanning && !transferPortfolio && planningCount > 0 && (
                  <p className="text-xs text-amber-700">
                    Les cibles manquantes seront automatiquement ajoutées au portefeuille du destinataire.
                  </p>
                )}
              </div>
            </label>
          </div>

          <div className="space-y-1.5">
            <Label>Note (optionnelle)</Label>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Motif du transfert..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
              Annuler
            </Button>
            <Button onClick={submit} disabled={!canSubmit || isPending}>
              {isPending ? "Transfert..." : "Confirmer le transfert"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
