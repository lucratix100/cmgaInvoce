import { BaseSeeder } from '@adonisjs/lucid/seeders'
import UserActivitie from '#models/user_activitie'
import User from '#models/user'
import { Role } from '#app/enum/index.js'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    // Récupérer quelques utilisateurs pour créer des activités
    const users = await User.query().limit(5)
    
    if (users.length === 0) {
      console.log('Aucun utilisateur trouvé pour créer des activités de test')
      return
    }

    const activities = [
      {
        userId: users[0].id,
        action: 'Connexion',
        role: users[0].role,
        details: { ip: '192.168.1.100' }
      },
      {
        userId: users[1].id,
        action: 'Scan facture',
        role: users[1].role,
        details: { invoiceNumber: 'FAC-2024-001', status: 'en attente de livraison' }
      },
      {
        userId: users[2].id,
        action: 'Livraison facture',
        role: users[2].role,
        details: { invoiceNumber: 'FAC-2024-002', status: 'livrée' }
      },
      {
        userId: users[3].id,
        action: 'Création utilisateur',
        role: users[3].role,
        details: { newUser: 'john.doe@example.com', role: 'magasinier' }
      },
      {
        userId: users[4].id,
        action: 'Modification facture',
        role: users[4].role,
        details: { invoiceNumber: 'FAC-2024-003', oldStatus: 'en cours', newStatus: 'livrée' }
      },
      {
        userId: users[0].id,
        action: 'Déconnexion',
        role: users[0].role,
        details: { sessionDuration: '2h 15m' }
      },
      {
        userId: users[1].id,
        action: 'Création BL',
        role: users[1].role,
        details: { blNumber: 'BL-2024-001', driver: 'Mamadou Ba' }
      },
      {
        userId: users[2].id,
        action: 'Confirmation livraison',
        role: users[2].role,
        details: { blNumber: 'BL-2024-002', customer: 'Entreprise ABC' }
      }
    ]

    // Créer les activités avec des timestamps différents (dernières 24h)
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i]
      const hoursAgo = activities.length - i - 1 // Plus récent en premier
      
      await UserActivitie.create({
        ...activity,
        createdAt: DateTime.now().minus({ hours: hoursAgo })
      })
    }

    console.log(`${activities.length} activités de test créées`)
  }
}