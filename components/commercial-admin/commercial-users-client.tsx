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
  createCommercialAgent,
  deactivateCommercialAgent,
  getCommercialAgents,
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
}

export default function CommercialUsersClient({ initialAgents }: { initialAgents: CommercialUser[] }) {
  const [agents, setAgents] = useState(initialAgents)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const refresh = async () => {
    setAgents(await getCommercialAgents())
  }

  const reset = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const submit = () => {
    startTransition(async () => {
      const payload: any = { ...form }
      if (editingId && !payload.password) {
        delete payload.password
        delete payload.confirmPassword
      }

      const result = editingId
        ? await updateCommercialAgent(editingId, payload)
        : await createCommercialAgent(payload)

      if (!result.success) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" })
        return
      }

      toast({
        title: "Succès",
        description: editingId ? "Commercial modifié avec succès" : "Commercial ajouté avec succès",
      })
      reset()
      await refresh()
    })
  }

  const edit = (agent: CommercialUser) => {
    setEditingId(agent.id)
    setForm({
      firstname: agent.firstname || "",
      lastname: agent.lastname || "",
      email: agent.email || "",
      phone: agent.phone || "",
      password: "",
      confirmPassword: "",
      isActive: agent.isActive,
    })
  }

  const deactivate = (agent: CommercialUser) => {
    startTransition(async () => {
      const result = await deactivateCommercialAgent(agent.id)
      if (!result.success) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" })
        return
      }
      toast({ title: "Succès", description: "Commercial désactivé" })
      await refresh()
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
            <Field label="Prénom" value={form.firstname} onChange={(value) => setForm({ ...form, firstname: value })} />
            <Field label="Nom" value={form.lastname} onChange={(value) => setForm({ ...form, lastname: value })} />
          </div>
          <Field label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
          <Field label="Téléphone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
          <Field
            label={editingId ? "Nouveau mot de passe (optionnel)" : "Mot de passe"}
            type="password"
            value={form.password}
            onChange={(value) => setForm({ ...form, password: value })}
          />
          <Field
            label="Confirmation"
            type="password"
            value={form.confirmPassword}
            onChange={(value) => setForm({ ...form, confirmPassword: value })}
          />
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
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
