'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog"
import DriverDialog from "./driver-dialog"
import DriverTable from "./driver-table"
import { Card } from "@/components/ui/card"

interface Driver {
  id: number
  firstname: string
  lastname: string
  phone: string
  isActive: boolean
}

export default function DriversPage() {
  const [open, setOpen] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [key, setKey] = useState(0)

  const handleEdit = (driver: Driver) => {
    setSelectedDriver(driver)
    setOpen(true)
  }

  const handleClose = () => {
    setSelectedDriver(null)
    setOpen(false)
  }

  const handleSuccess = () => {
    setKey(key + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Gestion des conducteurs</h1>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Rechercher un conducteur..." className="pl-8" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-primary hover:bg-primary-600"
                onClick={() => setSelectedDriver(null)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un conducteur
              </Button>
            </DialogTrigger>
            <DriverDialog 
              onClose={handleClose}
              onSuccess={handleSuccess}
              driver={selectedDriver}
            />
          </Dialog>
        </div>
      </div>
      <Card className="border-none shadow-md overflow-hidden">
        <DriverTable key={key} onEdit={handleEdit} />
      </Card>
    </div>
  )
} 