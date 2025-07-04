import { BaseSeeder } from '@adonisjs/lucid/seeders'
import InvoiceReminder from '#models/invoice_reminder'
import User from '#models/user'
import { Role } from '../../app/enum/index.js'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    // Récupérer un utilisateur admin pour les tests
    const adminUser = await User.query().where('role', Role.ADMIN).first()
    
    if (!adminUser) {
      console.log('Aucun utilisateur admin trouvé pour créer des notifications de test')
      return
    }

    const notifications = [
      {
        userId: adminUser.id,
        invoiceId: null,
        remindAt: DateTime.now(),
        comment: '🆕 Nouveau Bon de Livraison créé - Un nouveau bon de livraison a été créé par Mamadou Ba (BL-2024-001, Conducteur: Omar Sall, Facture: FAC-2024-001, Client: Entreprise ABC)'.slice(0, 255),
        read: false
      },
      {
        userId: adminUser.id,
        invoiceId: null,
        remindAt: DateTime.now().minus({ hours: 1 }),
        comment: '💰 Nouveau paiement enregistré - Un nouveau paiement a été enregistré par Fatou Diop (Montant: 150000, Méthode: Virement bancaire, Facture: FAC-2024-002, Client: Société XYZ)'.slice(0, 255),
        read: false
      },
      {
        userId: adminUser.id,
        invoiceId: null,
        remindAt: DateTime.now().minus({ hours: 2 }),
        comment: '👤 Nouvel utilisateur créé - Un nouvel utilisateur a été créé par Serigne Saliou Ndiaye (Email: nouveau@example.com, Rôle: magasinier)'.slice(0, 255),
        read: true
      },
      {
        userId: adminUser.id,
        invoiceId: null,
        remindAt: DateTime.now().minus({ hours: 3 }),
        comment: '📋 Statut de facture modifié - Le statut d\'une facture a été modifié par Omar Gueye (Ancien statut: en cours, Nouveau statut: livrée, Client: Client DEF)'.slice(0, 255),
        read: false
      }
    ]

    // Créer les notifications
    for (const notification of notifications) {
      await InvoiceReminder.create(notification)
    }

    console.log(`${notifications.length} notifications de test créées`)
  }
} 