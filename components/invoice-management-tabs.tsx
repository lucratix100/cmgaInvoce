"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RootManagement } from "@/components/root-management"
import { InvoiceAssignment } from "@/components/invoice-assignment"
import { DepotAssignment } from "@/components/depot-assignment"
import { FileText, Users, Building } from "lucide-react"
import { getRoots, createRoot, updateRoot, deleteRoot } from "@/actions/root-actions"
import { toast } from "sonner"

interface Root {
  id: string
  value: string
  suffixes: {
    id: string
    value: string
  }[]
  expanded: boolean
}

export function InvoiceManagementTabs() {
  const [roots, setRoots] = useState<Root[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRoots = async () => {
    try {
      const data = await getRoots()
      const transformedRoots = data.map((root: any) => ({
        id: root.id.toString(),
        value: root.name,
        suffixes: root.commercialInitials.map((initial: any) => ({
          id: initial.id.toString(),
          value: initial.name
        })),
        expanded: false
      }))
      setRoots(transformedRoots)
    } catch (err) {
      setError('Erreur lors du chargement des racines')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoots()
  }, [])

  const handleCreateRoot = async (name: string) => {
    try {
      await createRoot(name)
      await fetchRoots()
      toast.success('Racine créée avec succès')
    } catch (error) {
      toast.error('Erreur lors de la création de la racine')
      console.error(error)
    }
  }

  const handleUpdateRoot = async (id: string, name: string) => {
    try {
      await updateRoot(parseInt(id), name)
      await fetchRoots()
      toast.success('Racine mise à jour avec succès')
    } catch (error) {
      toast.error('Erreur lors de la mise à jour de la racine')
      console.error(error)
    }
  }

  const handleDeleteRoot = async (id: string) => {
    try {
      await deleteRoot(parseInt(id))
      toast.success('Racine supprimée avec succès')
      await fetchRoots()
    } catch (error) {
      toast.error('Erreur lors de la suppression de la racine')
      console.error(error)
    }
  }

  if (loading) {
    return <div>Chargement...</div>
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <Tabs defaultValue="roots" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-8 bg-gray-200">
        <TabsTrigger value="roots" className="flex items-center data-[state=active]:bg-primary  data-[state=active]:text-white">
          <FileText className="mr-2 h-4 w-4" />
          Gestion des Racines
        </TabsTrigger>
        <TabsTrigger value="assignment" className="flex items-center data-[state=active]:bg-primary  data-[state=active]:text-white">
          <Users className="mr-2 h-4 w-4" />
          Affectation par Racine
        </TabsTrigger>
        <TabsTrigger value="depot-assignment" className="flex items-center data-[state=active]:bg-primary  data-[state=active]:text-white">
          <Building className="mr-2 h-4 w-4" />
          Affectation par Dépôt
        </TabsTrigger>
      </TabsList>

      <TabsContent value="roots" className="mt-0">
        <RootManagement
          roots={roots}
          setRoots={setRoots}
          onCreateRoot={handleCreateRoot}
          onUpdateRoot={handleUpdateRoot}
          onDeleteRoot={handleDeleteRoot}
        />
      </TabsContent>

      <TabsContent value="assignment" className="mt-0">
        <InvoiceAssignment roots={roots} />
      </TabsContent>

      <TabsContent value="depot-assignment" className="mt-0">
        <DepotAssignment />
      </TabsContent>
    </Tabs>
  )
}
