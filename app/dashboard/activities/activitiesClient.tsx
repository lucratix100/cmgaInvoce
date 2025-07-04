"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useRecouvrementActivities } from "@/hooks/useRecentActivities"
import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { RefreshCw, DollarSign, FileText, Users, TrendingUp, AlertTriangle, CheckCircle, Clock, Search, Filter, Calendar, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import { UserActivity } from '@/actions/user-activities'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

export default function ActivitiesClient() {
  const { activities, isLoading, error, refetch, isFetching } = useRecouvrementActivities()
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const itemsPerPage = 7
  const router = useRouter()

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'création paiement':
      case 'paiement':
        return <DollarSign className="h-4 w-4" />
      case 'scan facture':
      case 'modification facture':
        return <FileText className="h-4 w-4" />
      case 'création utilisateur':
      case 'modification utilisateur':
        return <Users className="h-4 w-4" />
      case 'connexion':
        return <CheckCircle className="h-4 w-4" />
      case 'déconnexion':
        return <Clock className="h-4 w-4" />
      default:
        return <TrendingUp className="h-4 w-4" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'création paiement':
      case 'paiement':
        return "bg-green-100 text-green-800"
      case 'scan facture':
      case 'modification facture':
        return "bg-blue-100 text-blue-800"
      case 'création utilisateur':
      case 'modification utilisateur':
        return "bg-purple-100 text-purple-800"
      case 'connexion':
        return "bg-green-100 text-green-800"
      case 'déconnexion':
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-orange-100 text-orange-800"
    }
  }

  const getActionText = (activity: UserActivity) => {
    const userName = `${activity.user.firstname} ${activity.user.lastname}`
    const details = activity.details || {}
    
    switch (activity.action.toLowerCase()) {
      case 'création paiement':
        const paymentAmount = details.amount
        const paymentMethod = details.paymentMethod
        const invoiceNumber = details.invoiceNumber
        if (paymentAmount && paymentMethod && invoiceNumber) {
          return `${userName} a créé un paiement de ${Number(paymentAmount).toLocaleString('fr-FR')} FCFA (${paymentMethod}) pour la facture ${invoiceNumber}`
        } else if (paymentAmount && paymentMethod) {
          return `${userName} a créé un paiement de ${Number(paymentAmount).toLocaleString('fr-FR')} FCFA (${paymentMethod})`
        } else if (paymentAmount) {
          return `${userName} a créé un paiement de ${Number(paymentAmount).toLocaleString('fr-FR')} FCFA`
        }
        return `${userName} a créé un nouveau paiement`
      
      case 'scan facture':
        const scannedInvoiceNumber = details.invoiceNumber || activity.invoice?.invoice_number
        const newStatus = details.newStatus
        if (scannedInvoiceNumber && newStatus) {
          return `${userName} a scanné la facture ${scannedInvoiceNumber} → ${newStatus}`
        } else if (scannedInvoiceNumber) {
          return `${userName} a scanné la facture ${scannedInvoiceNumber}`
        }
        return `${userName} a scanné une facture`
      
      case 'modification facture':
        const modifiedInvoiceNumber = details.invoiceNumber || activity.invoice?.invoice_number
        const oldStatus = details.oldStatus
        const modifiedNewStatus = details.newStatus
        if (modifiedInvoiceNumber && oldStatus && modifiedNewStatus) {
          return `${userName} a modifié la facture ${modifiedInvoiceNumber} : ${oldStatus} → ${modifiedNewStatus}`
        } else if (modifiedInvoiceNumber) {
          return `${userName} a modifié la facture ${modifiedInvoiceNumber}`
        }
        return `${userName} a modifié une facture`
      
      case 'connexion':
        return `${userName} s'est connecté au système`
      
      case 'déconnexion':
        return `${userName} s'est déconnecté du système`
      
      case 'création utilisateur':
        const newUserEmail = details.createdUserEmail
        if (newUserEmail) {
          return `${userName} a créé l'utilisateur ${newUserEmail}`
        }
        return `${userName} a créé un nouvel utilisateur`
      
      case 'modification utilisateur':
        return `${userName} a modifié un utilisateur`
      
      default:
        return `${userName} a effectué l'action : ${activity.action}`
    }
  }

  const getInitials = (firstname: string, lastname: string) => {
    return `${firstname.charAt(0)}${lastname.charAt(0)}`.toUpperCase()
  }

  // Fonction pour formater les montants en FCFA
  const formatAmount = (amount: number | string) => {
    const numAmount = Number(amount)
    if (isNaN(numAmount)) return '0 FCFA'
    return `${numAmount.toLocaleString('fr-FR')} FCFA`
  }

  // Fonction pour obtenir les détails formatés d'une activité
  const getActivityDetails = (activity: UserActivity) => {
    const details = activity.details || {}
    
    switch (activity.action.toLowerCase()) {
      case 'création paiement':
        return {
          amount: details.amount ? formatAmount(details.amount) : null,
          method: details.paymentMethod || null,
          invoiceNumber: details.invoiceNumber || null
        }
      case 'scan facture':
      case 'modification facture':
        return {
          invoiceNumber: details.invoiceNumber || activity.invoice?.invoice_number || null,
          oldStatus: details.oldStatus || null,
          newStatus: details.newStatus || null
        }
      case 'création utilisateur':
        return {
          email: details.createdUserEmail || null,
          role: details.createdUserRole || null
        }
      default:
        return {}
    }
  }

  // Vérifier si une activité est liée à une facture
  const hasInvoiceLink = (activity: UserActivity) => {
    return activity.invoiceId || 
           activity.invoice?.id || 
           activity.details?.invoiceNumber ||
           activity.action.toLowerCase().includes('facture')
  }

  // Obtenir le numéro de facture pour la redirection
  const getInvoiceNumber = (activity: UserActivity) => {
    if (activity.details?.invoiceNumber) return activity.details.invoiceNumber
    if (activity.invoice?.invoice_number) return activity.invoice.invoice_number
    return null
  }

  // Rediriger vers la facture
  const handleActivityClick = (activity: UserActivity) => {
    if (hasInvoiceLink(activity)) {
      const invoiceNumber = getInvoiceNumber(activity)
      if (invoiceNumber) {
        router.push(`/dashboard/invoices/${invoiceNumber}`)
      }
    }
  }

  // Filtrer les activités importantes
  const importantActivities = useMemo(() => {
    return activities.filter(activity => 
      activity.action.toLowerCase().includes('paiement') ||
      activity.action.toLowerCase().includes('facture') ||
      activity.action.toLowerCase().includes('utilisateur')
    )
  }, [activities])

  // Appliquer les filtres
  const filteredActivities = useMemo(() => {
    let filtered = importantActivities

    // Filtre par utilisateur
    if (selectedUser !== 'all') {
      filtered = filtered.filter(activity => activity.user.id === selectedUser)
    }

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(activity => {
        const userName = `${activity.user.firstname} ${activity.user.lastname}`.toLowerCase()
        const action = activity.action.toLowerCase()
        const details = JSON.stringify(activity.details || {}).toLowerCase()
        const search = searchTerm.toLowerCase()
        
        return userName.includes(search) || 
               action.includes(search) || 
               details.includes(search)
      })
    }

    // Filtre par date
    if (startDate || endDate) {
      filtered = filtered.filter(activity => {
        const activityDate = new Date(activity.createdAt)
        const start = startDate ? new Date(startDate) : null
        const end = endDate ? new Date(endDate + 'T23:59:59') : null

        if (start && end) {
          return activityDate >= start && activityDate <= end
        } else if (start) {
          return activityDate >= start
        } else if (end) {
          return activityDate <= end
        }
        return true
      })
    }

    return filtered
  }, [importantActivities, selectedUser, searchTerm, startDate, endDate])

  // Pagination
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedActivities = filteredActivities.slice(startIndex, endIndex)

  // Obtenir la liste unique des utilisateurs
  const uniqueUsers = useMemo(() => {
    const users = new Map()
    importantActivities.forEach(activity => {
      const userId = activity.user.id
      if (!users.has(userId)) {
        users.set(userId, {
          id: userId,
          name: `${activity.user.firstname} ${activity.user.lastname}`,
          firstname: activity.user.firstname,
          lastname: activity.user.lastname
        })
      }
    })
    return Array.from(users.values()).sort((a, b) => 
      `${a.firstname} ${a.lastname}`.localeCompare(`${b.firstname} ${b.lastname}`)
    )
  }, [importantActivities])

  const stats = {
    totalActivities: activities.length,
    importantActivities: importantActivities.length,
    filteredActivities: filteredActivities.length,
    payments: importantActivities.filter(a => a.action.toLowerCase().includes('paiement')).length,
    invoices: importantActivities.filter(a => a.action.toLowerCase().includes('facture')).length,
    users: importantActivities.filter(a => a.action.toLowerCase().includes('utilisateur')).length,
    totalAmount: importantActivities
      .filter(a => a.action.toLowerCase().includes('paiement'))
      .reduce((sum, activity) => {
        const amount = Number(activity.details?.amount || 0)
        return sum + (isNaN(amount) ? 0 : amount)
      }, 0)
  }

  // Réinitialiser la page quand les filtres changent
  const resetPage = () => {
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Activités</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalActivities}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Activités Importantes</p>
                <p className="text-2xl font-bold text-orange-600">{stats.importantActivities}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Paiements</p>
                <p className="text-2xl font-bold text-green-600">{stats.payments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Factures</p>
                <p className="text-2xl font-bold text-purple-600">{stats.invoices}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Montant Total</p>
                <p className="text-lg font-bold text-emerald-600">{formatAmount(stats.totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <span>Filtres</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Rechercher</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    resetPage()
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Utilisateur</label>
              <Select value={selectedUser} onValueChange={(value) => {
                setSelectedUser(value)
                resetPage()
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les utilisateurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les utilisateurs</SelectItem>
                  {uniqueUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Date de début</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    resetPage()
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Date de fin</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    resetPage()
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          
          {/* Résultats du filtrage */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {filteredActivities.length} activité{filteredActivities.length > 1 ? 's' : ''} trouvée{filteredActivities.length > 1 ? 's' : ''}
              {(selectedUser !== 'all' || searchTerm || startDate || endDate) && (
                <span className="ml-2">
                  (sur {stats.importantActivities} importantes)
                </span>
              )}
            </div>
            
            <Button
              onClick={() => {
                setSelectedUser('all')
                setSearchTerm('')
                setStartDate('')
                setEndDate('')
                resetPage()
              }}
              variant="outline"
              size="sm"
              disabled={selectedUser === 'all' && !searchTerm && !startDate && !endDate}
            >
              Réinitialiser les filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Onglets pour les activités */}
      <Tabs defaultValue="important" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="important">Activités Importantes</TabsTrigger>
            <TabsTrigger value="recent">Toutes les Activités</TabsTrigger>
          </TabsList>
          
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            disabled={isFetching}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </Button>
        </div>

        <TabsContent value="important" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span>Activités Importantes des Utilisateurs de Recouvrement</span>
              </CardTitle>
              <CardDescription>
                Actions critiques liées aux paiements, factures et gestion des utilisateurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : paginatedActivities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium">
                    {importantActivities.length === 0 ? 'Aucune activité importante' : 'Aucun résultat trouvé'}
                  </h3>
                  <p className="text-sm">
                    {importantActivities.length === 0 
                      ? 'Il n\'y a pas d\'activités importantes à afficher pour le moment.'
                      : 'Essayez de modifier vos critères de recherche.'
                    }
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {paginatedActivities.map((activity) => {
                      const activityDetails = getActivityDetails(activity)
                      return (
                        <div 
                          key={activity.id} 
                          className={`flex items-start gap-4 p-4 border rounded-lg transition-colors ${
                            hasInvoiceLink(activity) 
                              ? 'hover:bg-blue-50 cursor-pointer hover:border-blue-300' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleActivityClick(activity)}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className={getActionColor(activity.action)}>
                              {getActionIcon(activity.action)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium">
                                  {getActionText(activity)}
                                </p>
                                {hasInvoiceLink(activity) && (
                                  <ExternalLink className="h-4 w-4 text-blue-500" />
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {formatDistanceToNow(new Date(activity.createdAt), { 
                                  addSuffix: true, 
                                  locale: fr 
                                })}
                              </Badge>
                            </div>
                            
                            {/* Détails supplémentaires */}
                            {Object.keys(activityDetails).length > 0 && (
                              <div className="mt-2 p-2 bg-gray-50 rounded-md">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                  {activityDetails.amount && (
                                    <div className="flex items-center space-x-1">
                                      <span className="font-medium text-green-700">Montant:</span>
                                      <span className="text-green-600">{activityDetails.amount}</span>
                                    </div>
                                  )}
                                  {activityDetails.method && (
                                    <div className="flex items-center space-x-1">
                                      <span className="font-medium text-blue-700">Méthode:</span>
                                      <span className="text-blue-600">{activityDetails.method}</span>
                                    </div>
                                  )}
                                  {activityDetails.invoiceNumber && (
                                    <div className="flex items-center space-x-1">
                                      <span className="font-medium text-purple-700">Facture:</span>
                                      <span className="text-purple-600">{activityDetails.invoiceNumber}</span>
                                    </div>
                                  )}
                                  {activityDetails.oldStatus && activityDetails.newStatus && (
                                    <div className="flex items-center space-x-1">
                                      <span className="font-medium text-orange-700">Statut:</span>
                                      <span className="text-orange-600">{activityDetails.oldStatus} → {activityDetails.newStatus}</span>
                                    </div>
                                  )}
                                  {activityDetails.email && (
                                    <div className="flex items-center space-x-1">
                                      <span className="font-medium text-indigo-700">Email:</span>
                                      <span className="text-indigo-600">{activityDetails.email}</span>
                                    </div>
                                  )}
                                  {activityDetails.role && (
                                    <div className="flex items-center space-x-1">
                                      <span className="font-medium text-indigo-700">Rôle:</span>
                                      <span className="text-indigo-600">{activityDetails.role}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-2 mt-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-primary text-white text-xs">
                                  {getInitials(activity.user.firstname, activity.user.lastname)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">
                                {activity.user.firstname} {activity.user.lastname}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {activity.role}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(activity.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-sm text-gray-600">
                        Page {currentPage} sur {totalPages} ({filteredActivities.length} activités)
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Précédent
                        </Button>
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                            if (page > totalPages) return null
                            return (
                              <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className="w-8 h-8 p-0"
                              >
                                {page}
                              </Button>
                            )
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          Suivant
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span>Toutes les Activités</span>
              </CardTitle>
              <CardDescription>
                Toutes les activités des utilisateurs de recouvrement (non filtrées)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium">Aucune activité récente</h3>
                  <p className="text-sm">Il n'y a pas d'activités récentes à afficher.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={getActionColor(activity.action)}>
                          {getActionIcon(activity.action)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {getActionText(activity)}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {activity.user.firstname} {activity.user.lastname}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.createdAt), { 
                              addSuffix: true, 
                              locale: fr 
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
