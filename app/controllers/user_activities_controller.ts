import UserActivitie from '#models/user_activitie'
import type { HttpContext } from '@adonisjs/core/http'
import { Role } from '../enum/index.js'

export default class UserActivitiesController {
  async recent({ response }: HttpContext) {
    const activities = await UserActivitie
      .query()
      .preload('user')
      .preload('invoice')
      .orderBy('created_at', 'desc')
      .limit(10)
    return response.json(activities)
  }

  async recouvrement({ response }: HttpContext) {
    try {
      // Récupérer toutes les activités des utilisateurs avec le rôle RECOUVREMENT
      const recouvrementActivities = await UserActivitie
        .query()
        .whereHas('user', (query) => {
          query.where('role', Role.RECOUVREMENT)
        })
        .preload('user')
        .preload('invoice')
        .orderBy('created_at', 'desc')
        // Pas de limite pour récupérer toutes les activités
      
      return response.json(recouvrementActivities)
    } catch (error) {
      console.error('Erreur lors de la récupération des activités de recouvrement:', error)
      return response.status(500).json({
        error: 'Erreur lors de la récupération des activités de recouvrement'
      })
    }
  }
}