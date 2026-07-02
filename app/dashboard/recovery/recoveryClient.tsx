"use client"

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertTriangle, Clock, DollarSign, User, Building, Settings, ChevronLeft, ChevronRight, ExternalLink, FileText } from "lucide-react"
import { UrgentInvoice } from "@/actions/recovery"
import { toast } from "sonner"
import { updateCustomDelay } from "@/actions/recovery"
import Link from "next/link"

interface RecoveryClientProps {
  initialData: {
    success: boolean
    urgentInvoices?: UrgentInvoice[]
    count?: number
    error?: string
    message?: string
  }
  user: any
}

export default function RecoveryClient({ initialData, user }: RecoveryClientProps) {
  const [urgentInvoices, setUrgentInvoices] = useState<UrgentInvoice[]>(initialData.urgentInvoices || [])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<UrgentInvoice | null>(null)
  const [customDelay, setCustomDelay] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Vérifier s'il y a une erreur de configuration
  const hasConfigurationError = !initialData.success && initialData.error

  // Filtrer les factures selon la recherche
  const filteredInvoices = urgentInvoices.filter(invoice => {
    const search = searchTerm.toLowerCase()
    return (
      invoice.invoiceNumber.toLowerCase().includes(search) ||
      invoice.accountNumber.toLowerCase().includes(search) ||
      invoice.customer?.name.toLowerCase().includes(search) ||
      invoice.depot?.name.toLowerCase().includes(search)
    )
  })

  // Calculs de pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentInvoices = filteredInvoices.slice(startIndex, endIndex)

  // Formater le montant
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'XOF' 
    }).format(amount)
  }

  // Formater la date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Calculer les jours de retard
  const getDaysOverdue = (date: string) => {
    const invoiceDate = new Date(date)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - invoiceDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Obtenir la couleur du badge selon le nombre de jours de retard
  const getBadgeVariant = (days: number) => {
    if (days > 90) return 'destructive'
    if (days > 60) return 'secondary'
    if (days > 30) return 'outline'
    return 'default'
  }

  // Mettre à jour le délai personnalisé
  const handleUpdateCustomDelay = async () => {
    if (!selectedInvoice || !customDelay) return

    try {
      setIsLoading(true)
      const days = parseInt(customDelay)
      
      if (isNaN(days) || days <= 0) {
        toast.error('Le délai doit être un nombre positif')
        return
      }

      await updateCustomDelay(selectedInvoice.id, days)
      
      toast.success(`Délai personnalisé ajouté pour la facture ${selectedInvoice.invoiceNumber}`)
      setIsDialogOpen(false)
      setCustomDelay('')
      setSelectedInvoice(null)
      
      // Recharger les données des factures urgentes
      window.location.reload()
      
    } catch (error) {
      toast.error('Erreur lors de l\'ajout du délai')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Ouvrir le dialogue pour modifier le délai
  const openCustomDelayDialog = (invoice: UrgentInvoice) => {
    setSelectedInvoice(invoice)
    setCustomDelay('')
    setIsDialogOpen(true)
  }

  // Navigation de pagination
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  // Fonction pour générer les numéros de page avec ellipses
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      // Si moins de 5 pages, afficher toutes
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Logique pour afficher les pages avec ellipses
      if (currentPage <= 3) {
        // Début : 1 2 3 4 5 ... 20
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        // Fin : 1 ... 16 17 18 19 20
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        // Milieu : 1 ... 8 9 10 11 12 ... 20
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }
    return pages
  }

  return (
    <div className="space-y-6">
      {/* Barre de recherche et filtres - Design plus élégant */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex-1">
          <Input
            placeholder="🔍 Rechercher par numéro de facture, client ou dépôt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>       
        <div className="text-2xl font-bold text-gray-900">{filteredInvoices.length}</div>
        <div className="text-gray-600 text-sm">Factures en retard</div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Page {currentPage} sur {totalPages}</span>
          <span>•</span>
          <span>{filteredInvoices.length} facture(s) trouvée(s)</span>
        </div>
      </div>
      {/* Message d'erreur de configuration */}
      {hasConfigurationError && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Settings className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-orange-900 mb-1">
                  Configuration requise
                </h3>
                <p className="text-orange-800 text-sm mb-3">
                  {initialData.message || 'Aucun délai de recouvrement configuré. Veuillez en créer un.'}
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/dashboard/recovery/settings'}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurer les délais
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Liste des factures urgentes - Design compact */}
      <div className="space-y-3">
        {currentInvoices.length === 0 ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="bg-green-100 p-3 rounded-full w-fit mx-auto mb-4">
                  <AlertTriangle className="h-12 w-12 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-green-900 mb-2">
                  Aucune facture urgente
                </h3>
                <p className="text-green-700">
                  Toutes les factures sont à jour dans leurs paiements.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          currentInvoices.map((invoice) => {
            const daysOverdue = getDaysOverdue(invoice.date)
            return (
              <Card key={invoice.id} className="border border-gray-200 bg-white hover:shadow-md transition-all duration-200 hover:border-orange-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold">#{invoice.invoiceNumber}</span>
                      <Badge variant={getBadgeVariant(daysOverdue)} className="text-xs">
                        {daysOverdue}j
                      </Badge>
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{invoice.customer?.name || 'N/A'}</span>
                      <Building className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{invoice.depot?.name || 'N/A'}</span>
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold">{formatAmount(invoice.totalTtc)}</span>
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{formatDate(invoice.date)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCustomDelayDialog(invoice)}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Délai
                      </Button>
                      
                      <Link href={`/dashboard/invoices/${invoice.invoiceNumber}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Voir
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600">
            Affichage de {startIndex + 1} à {Math.min(endIndex, filteredInvoices.length)} sur {filteredInvoices.length} factures
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1 mx-2">
              {getPageNumbers().map((item, index) => (
                <div key={index}>
                  {typeof item === 'number' ? (
                    <Button
                      variant={item === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(item)}
                      className={`w-8 h-8 p-0 text-sm ${
                        item === currentPage 
                          ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {item}
                    </Button>
                  ) : (
                    <span className="px-2 py-1 text-gray-400 text-sm">...</span>
                  )}
                </div>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogue pour modifier le délai personnalisé */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un délai personnalisé</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customDelay">Délai en jours</Label>
              <Input
                id="customDelay"
                type="number"
                placeholder="Ex: 30"
                value={customDelay}
                onChange={(e) => setCustomDelay(e.target.value)}
                min="1"
              />
            </div>
            
            <div className="text-sm text-gray-600">
              <p>Facture: <span className="font-medium">{selectedInvoice?.invoiceNumber}</span></p>
              <p>Client: <span className="font-medium">{selectedInvoice?.customer?.name}</span></p>
              <p className="text-orange-600 mt-2">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Note: Cette action ajoutera un nouveau délai personnalisé à cette facture.
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleUpdateCustomDelay}
                disabled={isLoading || !customDelay}
              >
                {isLoading ? 'Ajout...' : 'Ajouter le délai'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 