"use client"

import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getRecentActivities, UserActivity } from '@/actions/user-activities'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function RecentActivities() {
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const data = await getRecentActivities()
        setActivities(data)
      } catch (error) {
        console.error('Erreur lors du chargement des activités:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [])

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'créé':
      case 'création':
      case 'création facture':
      case 'création utilisateur':
      case 'création conducteur':
      case 'création dépôt':
      case 'création paiement':
      case 'création bl':
        return '➕'
      case 'modifié':
      case 'modification':
      case 'modification facture':
      case 'modification utilisateur':
      case 'modification conducteur':
      case 'modification dépôt':
      case 'modification paiement':
      case 'modification bl':
        return '✏️'
      case 'supprimé':
      case 'suppression':
      case 'suppression facture':
      case 'suppression utilisateur':
      case 'suppression conducteur':
      case 'suppression dépôt':
      case 'suppression paiement':
      case 'suppression bl':
        return '🗑️'
      case 'livré':
      case 'livraison':
      case 'livraison facture':
      case 'confirmation livraison':
        return '📦'
      case 'scanné':
      case 'scan':
      case 'scan facture':
        return '📱'
      case 'connecté':
      case 'connexion':
        return '🔐'
      case 'déconnexion':
        return '🚪'
      case 'traitement livraison':
        return '🚚'
      case 'paiement':
        return '💳'
      default:
        return '📋'
    }
  }

  const getActionText = (activity: UserActivity) => {
    const userName = `${activity.user.firstname} ${activity.user.lastname}`
    const details = activity.details || {}
    
    switch (activity.action.toLowerCase()) {
      // Connexions
      case 'connexion':
        return `${userName} s'est connecté`
      case 'déconnexion':
        return `${userName} s'est déconnecté`
      
      // Factures avec détails
      case 'création facture':
        return `${userName} a créé une nouvelle facture`
      case 'modification facture':
        return `${userName} a modifié une facture`
      case 'suppression facture':
        return `${userName} a supprimé une facture`
      case 'scan facture':
        const invoiceNumber = details.invoiceNumber || activity.invoice?.invoice_number
        const newStatus = details.newStatus
        if (invoiceNumber && newStatus) {
          return `${userName} a scanné la facture ${invoiceNumber} → ${newStatus}`
        } else if (invoiceNumber) {
          return `${userName} a scanné la facture ${invoiceNumber}`
        }
        return `${userName} a scanné une facture`
      case 'livraison facture':
        const deliveredInvoiceNumber = details.invoiceNumber || activity.invoice?.invoice_number
        const deliveredStatus = details.newStatus
        if (deliveredInvoiceNumber && deliveredStatus) {
          return `${userName} a livré la facture ${deliveredInvoiceNumber} → ${deliveredStatus}`
        } else if (deliveredInvoiceNumber) {
          return `${userName} a livré la facture ${deliveredInvoiceNumber}`
        }
        return `${userName} a livré une facture`
      
      // Utilisateurs
      case 'création utilisateur':
        const newUserEmail = details.createdUserEmail
        if (newUserEmail) {
          return `${userName} a créé l'utilisateur ${newUserEmail}`
        }
        return `${userName} a créé un nouvel utilisateur`
      case 'modification utilisateur':
        return `${userName} a modifié un utilisateur`
      case 'suppression utilisateur':
        const deletedUserEmail = details.deletedUserEmail
        if (deletedUserEmail) {
          return `${userName} a supprimé l'utilisateur ${deletedUserEmail}`
        }
        return `${userName} a supprimé un utilisateur`
      
      // Conducteurs
      case 'création conducteur':
        return `${userName} a créé un nouveau conducteur`
      case 'modification conducteur':
        return `${userName} a modifié un conducteur`
      case 'suppression conducteur':
        return `${userName} a supprimé un conducteur`
      
      // Dépôts
      case 'création dépôt':
        return `${userName} a créé un nouveau dépôt`
      case 'modification dépôt':
        return `${userName} a modifié un dépôt`
      case 'suppression dépôt':
        return `${userName} a supprimé un dépôt`
      
      // Paiements
      case 'création paiement':
        const paymentAmount = details.amount
        const paymentMethod = details.method
        if (paymentAmount && paymentMethod) {
          return `${userName} a créé un paiement de ${paymentAmount} FCFA (${paymentMethod})`
        } else if (paymentAmount) {
          return `${userName} a créé un paiement de ${paymentAmount} FCFA`
        }
        return `${userName} a créé un nouveau paiement`
      case 'modification paiement':
        return `${userName} a modifié un paiement`
      case 'suppression paiement':
        return `${userName} a supprimé un paiement`
      
      // BL (Bons de Livraison)
      case 'création bl':
        const driverName = details.driverName
        if (driverName) {
          return `${userName} a créé un BL pour ${driverName}`
        }
        return `${userName} a créé un nouveau bon de livraison`
      case 'modification bl':
        return `${userName} a modifié un bon de livraison`
      case 'suppression bl':
        return `${userName} a supprimé un bon de livraison`
      
      // Livraisons
      case 'confirmation livraison':
        const confirmedInvoiceNumber = details.invoiceNumber
        const confirmedStatus = details.status
        if (confirmedInvoiceNumber && confirmedStatus) {
          return `${userName} a confirmé la livraison de la facture ${confirmedInvoiceNumber} → ${confirmedStatus}`
        } else if (confirmedInvoiceNumber) {
          return `${userName} a confirmé la livraison de la facture ${confirmedInvoiceNumber}`
        }
        return `${userName} a confirmé une livraison`
      case 'traitement livraison':
        const processedInvoiceNumber = details.invoiceNumber
        const processedStatus = details.status
        if (processedInvoiceNumber && processedStatus) {
          return `${userName} a traité la livraison de la facture ${processedInvoiceNumber} → ${processedStatus}`
        } else if (processedInvoiceNumber) {
          return `${userName} a traité la livraison de la facture ${processedInvoiceNumber}`
        }
        return `${userName} a traité une livraison`
      
      // Actions génériques (fallback)
      case 'créé':
      case 'création':
        return `${userName} a créé un nouvel élément`
      case 'modifié':
      case 'modification':
        return `${userName} a modifié un élément`
      case 'supprimé':
      case 'suppression':
        return `${userName} a supprimé un élément`
      case 'livré':
      case 'livraison':
        return `${userName} a effectué une livraison`
      case 'scanné':
      case 'scan':
        return `${userName} a scanné un élément`
      
      default:
        return `${userName} a effectué l'action : ${activity.action}`
    }
  }

  const getInitials = (firstname: string, lastname: string) => {
    return `${firstname.charAt(0)}${lastname.charAt(0)}`.toUpperCase()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activités récentes</CardTitle>
          <CardDescription>Chargement des dernières actions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex items-start gap-4 pb-4 border-b last:border-0">
                <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activités récentes</CardTitle>
        <CardDescription>Dernières actions effectuées sur la plateforme</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune activité récente
            </div>
          ) : (
            activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-white text-xs">
                    {getActionIcon(activity.action)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {getActionText(activity)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.createdAt), { 
                      addSuffix: true, 
                      locale: fr 
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
} 