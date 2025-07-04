
import UserActivitie from '#models/user_activitie'
import type { HttpContext } from '@adonisjs/core/http'

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
}