"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import {
  createCommercialAgent,
  deactivateCommercialAgent,
  getCommercialAgents,
  resendCommercialAgentInvite,
  updateCommercialAgent,
} from "@/actions/commercial-admin"
import { CommercialUser } from "@/types/commercial"

const emptyForm = {
  firstname: "",
  lastname: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  isActive: true,
  role: "AGENT_COMMERCIAL" as const,
}

export default function CommercialUsersClient({ initialAgents }: { initialAgents: CommercialUser[] }) {
  const [agents, setAgents] = useState(initialAgents)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [errorDialog, setErrorDialog] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const refresh = async () => {
    setAgents(await getCommercialAgents())
  }

  const reset = () => {
    setForm(emptyForm)
    setEditingId(null)
    setFieldErrors({})
  }

  const showError = (message?: string, errors?: Record<string, string[]>) => {
    const text = message || "Une erreur est survenue"
    setFieldErrors(errors || {})
    setErrorDialog(text)
  }

  const submit = () => {
    setFieldErrors({})
    startTransition(async () => {
      const payload: any = { ...form }
      delete payload.password
      delete payload.confirmPassword

      const result = editingId
        ? await updateCommercialAgent(editingId, payload)
        : await createCommercialAgent(payload)

      if (!result.success) {
        showError(result.error, result.fieldErrors)
        return
      }

      toast({
        title: "Succès",
        description: editingId
          ? "Commercial modifié avec succès"
          : (result.data?.message || "Commercial créé. Un email d'invitation a été envoyé."),
      })
      reset()
      await refresh()
    })
  }

  const edit = (agent: CommercialUser) => {
    setEditingId(agent.id)
    setFieldErrors({})
    setForm({
      firstname: agent.firstname || "",
      lastname: agent.lastname || "",
      email: agent.email || "",
      phone: agent.phone || "",
      password: "",
      confirmPassword: "",
      isActive: agent.isActive,
      role: "AGENT_COMMERCIAL",
    })
  }

  const deactivate = (agent: CommercialUser) => {
    startTransition(async () => {
      const result = await deactivateCommercialAgent(agent.id)
      if (!result.success) {
        showError(result.error, result.fieldErrors)
        return
      }
      toast({ title: "Succès", description: "Commercial désactivé" })
      await refresh()
    })
  }

  const resendInvite = (agent: CommercialUser) => {
    if (!agent.email) {
      showError("Ce commercial n'a pas d'email")
      return
    }

    startTransition(async () => {
      const result = await resendCommercialAgentInvite(agent.id)
      if (!result.success) {
        showError(result.error, result.fieldErrors)
        return
      }
      toast({
        title: "Email envoyé",
        description:
          (result.data as any)?.message ||
          (agent.isActive
            ? "Lien de réinitialisation envoyé."
            : "Invitation renvoyée pour activer le compte."),
      })
    })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Modifier un commercial" : "Ajouter un commercial"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom" value={form.firstname} error={fieldErrors.firstname} onChange={(value) => setForm({ ...form, firstname: value })} />
            <Field label="Nom" value={form.lastname} error={fieldErrors.lastname} onChange={(value) => setForm({ ...form, lastname: value })} />
          </div>
          <Field label="Email" value={form.email} error={fieldErrors.email} onChange={(value) => setForm({ ...form, email: value })} />
          <Field label="Téléphone" value={form.phone} error={fieldErrors.phone} onChange={(value) => setForm({ ...form, phone: value })} />
          {fieldErrors.general && (
            <p className="text-sm text-red-600">{fieldErrors.general.join(", ")}</p>
          )}
          {!editingId && (
            <p className="text-sm text-muted-foreground">
              Le compte restera inactif jusqu&apos;à ce que le commercial définisse son mot de passe via l&apos;email d&apos;invitation.
            </p>
          )}
          {editingId && (
            <p className="text-sm text-muted-foreground">
              Pour le mot de passe, utilisez le bouton « Renvoyer invitation » / « Renvoyer lien MDP ».
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={submit} disabled={isPending} className="flex-1">
              {editingId ? "Modifier" : "Ajouter"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={reset} disabled={isPending}>
                Annuler
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commerciaux</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">{agent.firstname} {agent.lastname}</TableCell>
                  <TableCell>{agent.phone}</TableCell>
                  <TableCell>{agent.email || "Non renseigné"}</TableCell>
                  <TableCell>
                    <Badge variant={agent.isActive ? "outline" : "destructive"}>
                      {agent.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    {agent.email && (
                      <Button size="sm" variant="secondary" onClick={() => resendInvite(agent)} disabled={isPending}>
                        {agent.isActive ? "Renvoyer lien MDP" : "Renvoyer invitation"}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => edit(agent)}>
                      Modifier
                    </Button>
                    {agent.isActive && (
                      <Button size="sm" variant="destructive" onClick={() => deactivate(agent)}>
                        Désactiver
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {agents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Aucun commercial trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!errorDialog} onOpenChange={(open) => !open && setErrorDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Erreur</AlertDialogTitle>
            <AlertDialogDescription>{errorDialog}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialog(null)}>Fermer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  error?: string[]
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(error?.length && "border-red-500")}
      />
      {error?.length ? <p className="text-xs text-red-600">{error.join(", ")}</p> : null}
    </div>
  )
}
