import User from '#models/user'
import { loginValidator } from '#validators/auth'
import type { HttpContext } from '@adonisjs/core/http'
import UserActivityService from '#services/user_activity_service'

export default class AuthController {

  public async login({ request, response }: HttpContext) {
    const { phone, password } = await request.validateUsing(loginValidator)
    const user = await User.verifyCredentials(phone, password)
    if (!user.isActive) {
      return response.status(403).json({ message: 'Votre compte a été bloqué...' })
    }
    const accessToken = await User.accessTokens.create(user)
    const refreshToken = await User.refreshTokens.create(user)
    
    // Enregistrer l'activité de connexion
    await UserActivityService.logActivity(
      Number(user.id),
      UserActivityService.ACTIONS.LOGIN,
      user.role
    )
    
    return response.ok({
      user: user.serialize(),
      accessToken: accessToken,
      refreshToken: refreshToken.value,
      type: 'bearer'
    })
  }
  public async refresh({ request, response }: HttpContext) {
    const refreshToken = request.input('refresh_token')
    try {
      const token = await User.refreshTokens.verify(refreshToken)
      const user = await User.findOrFail(token?.tokenableId)
      if (!user.isActive) {
        return response.unauthorized('Account is not active')
      }
      await User.refreshTokens.delete(user, refreshToken)
      const newAccessToken = await User.accessTokens.create(user)
      const newRefreshToken = await User.refreshTokens.create(user)
      return response.ok({
        accessToken: newAccessToken.value,
        refreshToken: newRefreshToken.value,
        type: 'bearer'
      })
    } catch (error) {
      return response.unauthorized('Invalid refresh token')
    }
  }

  public async logout({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const token = auth.user?.currentAccessToken.identifier
    if (!token) {
      return response.badRequest({ message: 'Token not found' })
    }
    await User.accessTokens.delete(user, token)
    
    // Enregistrer l'activité de déconnexion
    await UserActivityService.logActivity(
      Number(user.id),
      UserActivityService.ACTIONS.LOGOUT,
      user.role
    )
    
    return response.ok({ message: 'Logged out' })
   }
   
}

