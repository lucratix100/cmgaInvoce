"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import {
  createCommercialProduct,
  deleteCommercialProduct,
  getCommercialProducts,
  updateCommercialProduct,
} from "@/actions/commercial-admin"
import { CommercialProduct } from "@/types/commercial"
import { Loader2, Package, Pencil, Plus, Search, Trash2 } from "lucide-react"

const emptyForm = {
  name: "",
}

export default function CommercialProductsClient({
  initialProducts,
}: {
  initialProducts: CommercialProduct[]
}) {
  const [products, setProducts] = useState(initialProducts)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const refresh = async () => {
    setProducts(await getCommercialProducts())
  }

  const reset = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const submit = () => {
    if (!form.name.trim()) {
      toast({ title: "Nom requis", description: "Saisissez le nom du produit", variant: "destructive" })
      return
    }

    startTransition(async () => {
      const payload = {
        name: form.name.trim(),
      }

      const result = editingId
        ? await updateCommercialProduct(editingId, payload)
        : await createCommercialProduct(payload)

      if (!result.success) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" })
        return
      }

      toast({
        title: "Succès",
        description: editingId ? "Produit modifié" : "Produit créé",
      })
      reset()
      await refresh()
    })
  }

  const edit = (product: CommercialProduct) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
    })
  }

  const remove = (product: CommercialProduct) => {
    if (!confirm(`Supprimer le produit « ${product.name} » ?`)) return

    startTransition(async () => {
      const result = await deleteCommercialProduct(product.id)
      if (!result.success) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" })
        return
      }
      toast({ title: "Succès", description: "Produit supprimé" })
      if (editingId === product.id) reset()
      await refresh()
    })
  }

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Produits enregistrés</p>
              <p className="text-2xl font-bold">{products.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm md:col-span-2">
          <CardContent className="flex h-full flex-col justify-center p-4">
            <p className="font-semibold text-gray-900">Catalogue simple</p>
            <p className="text-sm text-muted-foreground">
              Seul le nom du produit est nécessaire pour alimenter la fiche de commande des agents.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="border-none shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? "Modifier le produit" : "Nouveau produit"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Nom du produit"
              value={form.name}
              onChange={(value) => setForm({ ...form, name: value })}
              placeholder="Ex : Seo 350ml"
            />
            <div className="rounded-xl border bg-gray-50 p-3 text-sm text-muted-foreground">
              Ce nom sera visible par les agents lors de la saisie d’une commande client.
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={submit} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Enregistrer" : "Créer le produit"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={reset} disabled={isPending}>
                  Annuler
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="space-y-3 pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Liste des produits</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un produit..."
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed bg-gray-50 text-center">
                <Package className="mb-3 h-9 w-9 text-muted-foreground" />
                <p className="font-medium text-gray-900">Aucun produit créé</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajoutez votre premier produit avec le formulaire à gauche.
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
                Aucun produit ne correspond à cette recherche.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Produit</TableHead>
                      <TableHead className="w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Package className="h-4 w-4" />
                            </div>
                            <span className="font-medium">{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => edit(product)} disabled={isPending}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => remove(product)}
                              disabled={isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}
