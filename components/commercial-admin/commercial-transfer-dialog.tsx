"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { transferCommercialResources } from "@/actions/commercial-admin"
import { CommercialAssignment, CommercialPlanningDay, CommercialPlanningItem, CommercialUser } from "@/types/commercial"
import { ArrowLeftRight, ArrowRightLeft, BriefcaseBusiness, CalendarDays } from "lucide-react"

type CommercialTransferDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  agents: CommercialUser[]
  fromAgentId: string
  assignments: CommercialAssignment[]
  planningItems: CommercialPlanningItem[]
  defaultTransferPortfolio?: boolean
  defaultTransferPlanning?: boolean
  onSuccess?: (toAgentId: string) => void
}

type TransferTarget = {
  key: string
  label: string
  assignmentId: number | null
  planningItemIds: number[]
  days: CommercialPlanningDay[]
  inPortfolio: boolean
  inPlanning: boolean
}

const DAY_LABEL: Record<CommercialPlanningDay, string> = {
  LUNDI: "Lun",
  MARDI: "Mar",
  MERCREDI: "Mer",
  JEUDI: "Jeu",
  VENDREDI: "Ven",
  SAMEDI: "Sam",
  DIMANCHE: "Dim",
}

function targetKey(record: { commercialClientId?: number | null; commercialClientLocationId?: number | null }) {
  return `${record.commercialClientId ?? "null"}:${record.commercialClientLocationId ?? "null"}`
}

function targetLabel(record: CommercialAssignment | CommercialPlanningItem) {
  const location = record.commercialClientLocation || record.location
  if (location) {
    return `${location.client?.name || record.client?.name || "Magasin"} – ${location.name}`
  }
  return record.client?.name || "Client"
}

export default function CommercialTransferDialog({
  open,
  onOpenChange,
  agents,
  fromAgentId,
  assignments,
  planningItems,
  defaultTransferPortfolio = true,
  defaultTransferPlanning = false,
  onSuccess,
}: CommercialTransferDialogProps) {
  const activeAgents = agents.filter((agent) => agent.isActive !== false)
  const fromAgent = activeAgents.find((agent) => String(agent.id) === fromAgentId)
  const destinationOptions = activeAgents.filter((agent) => String(agent.id) !== fromAgentId)

  const [toAgentId, setToAgentId] = useState("")
  const [operation, setOperation] = useState<"transfer" | "exchange">("transfer")
  const [transferPortfolio, setTransferPortfolio] = useState(defaultTransferPortfolio)
  const [transferPlanning, setTransferPlanning] = useState(defaultTransferPlanning)
  const [selectionMode, setSelectionMode] = useState<"all" | "pick">("all")
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [note, setNote] = useState("")
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const agentAssignments = useMemo(
    () => assignments.filter((assignment) => String(assignment.agentId) === fromAgentId && assignment.isActive !== false),
    [assignments, fromAgentId]
  )
  const agentPlanning = useMemo(
    () => planningItems.filter((item) => String(item.agentId) === fromAgentId && item.isActive !== false),
    [planningItems, fromAgentId]
  )
  const destinationAssignments = useMemo(
    () => assignments.filter((assignment) => String(assignment.agentId) === toAgentId && assignment.isActive !== false),
    [assignments, toAgentId]
  )
  const destinationPlanning = useMemo(
    () => planningItems.filter((item) => String(item.agentId) === toAgentId && item.isActive !== false),
    [planningItems, toAgentId]
  )
  const exchanging = operation === "exchange"
  const toAgent = destinationOptions.find((agent) => String(agent.id) === toAgentId)

  const targets = useMemo(() => {
    const byKey = new Map<string, TransferTarget>()

    const ensure = (record: CommercialAssignment | CommercialPlanningItem) => {
      const key = targetKey(record)
      const existing = byKey.get(key)
      if (existing) return existing
      const created: TransferTarget = {
        key,
        label: targetLabel(record),
        assignmentId: null,
        planningItemIds: [],
        days: [],
        inPortfolio: false,
        inPlanning: false,
      }
      byKey.set(key, created)
      return created
    }

    if (transferPortfolio) {
      for (const assignment of agentAssignments) {
        const target = ensure(assignment)
        target.assignmentId = assignment.id
        target.inPortfolio = true
        if (target.label === "Client") target.label = targetLabel(assignment)
      }
    }

    if (transferPlanning) {
      for (const item of agentPlanning) {
        const target = ensure(item)
        target.inPlanning = true
        if (!target.planningItemIds.includes(item.id)) target.planningItemIds.push(item.id)
        if (!target.days.includes(item.dayOfWeek)) target.days.push(item.dayOfWeek)
        if (target.label === "Client") target.label = targetLabel(item)
      }
    }

    return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label, "fr"))
  }, [agentAssignments, agentPlanning, transferPortfolio, transferPlanning])

  const targetSignature = targets.map((target) => target.key).join("|")

  useEffect(() => {
    if (!open) return
    setSelectedKeys(targetSignature ? targetSignature.split("|") : [])
  }, [open, targetSignature])

  const selectedTargets = targets.filter((target) => selectedKeys.includes(target.key))
  const visibleTargets = targets.filter((target) => target.label.toLowerCase().includes(search.trim().toLowerCase()))
  const chosenTargets = selectionMode === "all" ? targets : selectedTargets
  const excludedCount = selectionMode === "pick" ? targets.length - selectedTargets.length : 0

  const canSubmit = useMemo(() => {
    if (!fromAgentId || !toAgentId) return false
    if (exchanging) {
      return agentAssignments.length + agentPlanning.length + destinationAssignments.length + destinationPlanning.length > 0
    }
    if (!transferPortfolio && !transferPlanning) return false
    if (chosenTargets.length === 0) return false
    return true
  }, [
    fromAgentId,
    toAgentId,
    exchanging,
    transferPortfolio,
    transferPlanning,
    chosenTargets.length,
    agentAssignments.length,
    agentPlanning.length,
    destinationAssignments.length,
    destinationPlanning.length,
  ])

  const resetForm = () => {
    setToAgentId("")
    setOperation("transfer")
    setTransferPortfolio(defaultTransferPortfolio)
    setTransferPlanning(defaultTransferPlanning)
    setSelectionMode("all")
    setSelectedKeys([])
    setSearch("")
    setNote("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  const toggleTarget = (key: string, checked: boolean) => {
    setSelectedKeys((current) => {
      if (checked) return current.includes(key) ? current : [...current, key]
      return current.filter((value) => value !== key)
    })
  }

  const submit = () => {
    if (!canSubmit) return

    startTransition(async () => {
      const result = await transferCommercialResources({
        fromAgentId: Number(fromAgentId),
        toAgentId: Number(toAgentId),
        transferPortfolio: exchanging ? true : transferPortfolio,
        transferPlanning: exchanging ? true : transferPlanning,
        exchange: exchanging,
        assignmentIds:
          !exchanging && selectionMode === "pick" && transferPortfolio
            ? chosenTargets.flatMap((target) => (target.assignmentId ? [target.assignmentId] : []))
            : undefined,
        planningItemIds:
          !exchanging && selectionMode === "pick" && transferPlanning
            ? chosenTargets.flatMap((target) => target.planningItemIds)
            : undefined,
        note: note.trim() || undefined,
      })

      if (!result.success) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" })
        return
      }

      const summary = result.data
      const parts: string[] = []
      if (exchanging && summary) {
        parts.push(`${summary.assignmentsTransferred} cible(s) de portefeuille échangée(s)`)
        if (summary.assignmentsMerged > 0) {
          parts.push(`${summary.assignmentsMerged} déjà chez les deux, laissée(s) en place`)
        }
        parts.push(`${summary.planningTransferred} programme(s) échangé(s)`)
      } else if (summary && (transferPortfolio || summary.assignmentsTransferred + summary.assignmentsMerged > 0)) {
        parts.push(
          `${summary.assignmentsTransferred + summary.assignmentsMerged} cible(s) de portefeuille transférée(s)`
        )
        if (summary.assignmentsMerged > 0) {
          parts.push(`${summary.assignmentsMerged} déjà présente(s) chez le destinataire`)
        }
      }
      if (!exchanging && transferPlanning && summary) {
        parts.push(`${summary.planningTransferred} programme(s) transféré(s)`)
        if (summary.planningSkipped > 0) {
          parts.push(`${summary.planningSkipped} ignoré(s) (doublon ou invalide)`)
        }
      }

      toast({
        title: exchanging ? "Échange effectué" : "Transfert effectué",
        description: parts.join(" · ") || "L'opération a été effectuée avec succès.",
      })

      handleOpenChange(false)
      onSuccess?.(toAgentId)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {exchanging ? <ArrowLeftRight className="h-5 w-5 text-primary" /> : <ArrowRightLeft className="h-5 w-5 text-primary" />}
            {exchanging ? "Échanger avec un autre commercial" : "Transférer vers un autre commercial"}
          </DialogTitle>
          <DialogDescription>
            {exchanging ? (
              <>
                Échangez le portefeuille et le planning de{" "}
                <span className="font-medium text-foreground">
                  {fromAgent ? `${fromAgent.firstname} ${fromAgent.lastname}` : "ce commercial"}
                </span>{" "}
                avec ceux d'un autre commercial.
              </>
            ) : (
              <>
                Déplacez le portefeuille et/ou le planning de{" "}
                <span className="font-medium text-foreground">
                  {fromAgent ? `${fromAgent.firstname} ${fromAgent.lastname}` : "ce commercial"}
                </span>{" "}
                vers un autre commercial.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{exchanging ? "Échanger avec" : "Commercial destination"}</Label>
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

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOperation("transfer")}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                operation === "transfer" ? "border-primary bg-primary/5 font-medium" : "bg-white hover:bg-muted/40"
              }`}
            >
              <span className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-primary" />
                Transférer
              </span>
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                Un commercial reçoit, l'autre cède
              </span>
            </button>
            <button
              type="button"
              onClick={() => setOperation("exchange")}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                operation === "exchange" ? "border-primary bg-primary/5 font-medium" : "bg-white hover:bg-muted/40"
              }`}
            >
              <span className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-primary" />
                Échanger
              </span>
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                Planning et portefeuille des deux
              </span>
            </button>
          </div>

          {exchanging ? (
            <div className="space-y-2 rounded-xl border bg-muted/30 p-3 text-sm">
              <p>
                <span className="font-medium">{fromAgent ? `${fromAgent.firstname} ${fromAgent.lastname}` : "Source"}</span>
                <span className="text-muted-foreground"> cède {agentAssignments.length} cible(s) et {agentPlanning.length} programme(s).</span>
              </p>
              <p>
                <span className="font-medium">
                  {toAgent ? `${toAgent.firstname} ${toAgent.lastname}` : "L'autre commercial"}
                </span>
                <span className="text-muted-foreground"> cède {toAgentId ? destinationAssignments.length : "—"} cible(s) et {toAgentId ? destinationPlanning.length : "—"} programme(s).</span>
              </p>
              <p className="text-xs text-amber-700">
                Les cibles déjà présentes chez les deux restent en place. Chaque planning part chez l'autre.
              </p>
            </div>
          ) : (
          <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={transferPortfolio}
                onCheckedChange={(checked) => setTransferPortfolio(checked === true)}
                disabled={agentAssignments.length === 0}
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BriefcaseBusiness className="h-4 w-4 text-violet-500" />
                  Portefeuille
                </div>
                <p className="text-xs text-muted-foreground">
                  {agentAssignments.length > 0
                    ? `${agentAssignments.length} cible(s) dans ce portefeuille.`
                    : "Aucune cible dans ce portefeuille."}
                </p>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={transferPlanning}
                onCheckedChange={(checked) => setTransferPlanning(checked === true)}
                disabled={agentPlanning.length === 0}
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Planning hebdomadaire
                </div>
                <p className="text-xs text-muted-foreground">
                  {agentPlanning.length > 0
                    ? `${agentPlanning.length} programme(s). Les doublons seront ignorés.`
                    : "Aucun programme dans ce planning."}
                </p>
                {transferPlanning && !transferPortfolio && agentPlanning.length > 0 && (
                  <p className="text-xs text-amber-700">
                    Les cibles retenues quittent aussi le portefeuille source.
                  </p>
                )}
              </div>
            </label>
          </div>
          )}

          {!exchanging && (
          <>
          <div className="space-y-2">
            <Label>Étendue</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectionMode("all")}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                  selectionMode === "all" ? "border-primary bg-primary/5 font-medium" : "bg-white hover:bg-muted/40"
                }`}
              >
                Tout transférer
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {targets.length} cible(s)
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectionMode("pick")}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                  selectionMode === "pick" ? "border-primary bg-primary/5 font-medium" : "bg-white hover:bg-muted/40"
                }`}
              >
                Retirer certaines cibles
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  Décochez ce qui reste sur place
                </span>
              </button>
            </div>
          </div>

          {selectionMode === "pick" && (
            <div className="space-y-2 rounded-xl border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {selectedTargets.length} sélectionnée(s)
                  {excludedCount > 0 ? ` · ${excludedCount} laissée(s) au commercial source` : ""}
                </p>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSelectedKeys(targets.map((target) => target.key))}>
                    Tout
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSelectedKeys([])}>
                    Aucune
                  </Button>
                </div>
              </div>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher une cible..."
                className="h-8"
              />
              <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
                {visibleTargets.length === 0 ? (
                  <p className="px-1 py-3 text-sm text-muted-foreground">Aucune cible à afficher.</p>
                ) : (
                  visibleTargets.map((target) => (
                    <label key={target.key} className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1.5 hover:bg-muted/50">
                      <Checkbox
                        checked={selectedKeys.includes(target.key)}
                        onCheckedChange={(checked) => toggleTarget(target.key, checked === true)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{target.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {[
                            target.inPortfolio ? "Portefeuille" : null,
                            target.inPlanning
                              ? `Planning ${target.days.map((day) => DAY_LABEL[day]).join(", ")}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
          </>
          )}

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
              {isPending ? (exchanging ? "Échange..." : "Transfert...") : exchanging ? "Confirmer l'échange" : `Confirmer (${chosenTargets.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
