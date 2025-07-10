'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog"
import DepotDialog from "./depot-dialog"
import DepotTable from "./depot-table"
import { depot } from "@/types/index"


export default function DepotsPage() {
  const [open, setOpen] = useState(false)
  const [selectedDepot, setSelectedDepot] = useState<depot | null>(null)
  const [key, setKey] = useState(0)

  const handleEdit = (depot: depot) => {
    setSelectedDepot(depot)
    setOpen(true)
  }

  const handleClose = () => {
    setSelectedDepot(null)
    setOpen(false)
  }

  const handleSuccess = () => {
    setKey(key + 1) // Force le rafraîchissement de la table
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Gestion des dépôts</h1>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Rechercher un dépôt..." className="pl-8" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-primary hover:bg-primary-600"
                onClick={() => setSelectedDepot(null)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un dépôt
              </Button>
            </DialogTrigger>
            <DepotDialog 
              onClose={handleClose}
              onSuccess={handleSuccess}
              depot={selectedDepot}
            />
          </Dialog>
        </div>
      </div>
      <Card className="border-none shadow-md overflow-hidden">
        <DepotTable key={key} onEdit={handleEdit} />
      </Card>
    </div>
  )
} 