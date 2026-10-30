import User from '#models/user'
import {
  forgotPasswordValidator,
  loginValidator,
  resetPasswordValidator,
} from '#validators/auth'
import type { HttpContext } from '@adonisjs/core/http'
import UserActivityService from '#services/user_activity_service'
import PasswordTokenService from '#services/password_token_service'

export default class AuthController {
  public async login({ request, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    try {
      const user = await User.verifyCredentials(email, password)
      if (!user.isActive) {
        return response.status(403).json({
          message:
            'Votre compte n’est pas encore activé. Utilisez le lien reçu par email pour définir votre mot de passe.',
        })
      }
      const accessToken = await User.accessTokens.create(user)
      const refreshToken = await User.refreshTokens.create(user)

      await UserActivityService.logActivity(
        Number(user.id),
        UserActivityService.ACTIONS.LOGIN,
        user.role
      )

      return response.ok({
        user: user.serialize(),
        accessToken: accessToken,
        refreshToken: refreshToken.value,
        type: 'bearer',
      })
    } catch (error) {
      console.log(error)
      return response.status(401).json({ message: 'Email ou mot de passe incorrect...' })
    }
  }

  public async forgotPassword({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator)
    const genericMessage = {
      message: 'Si un compte existe avec cet email, un lien a été envoyé.',
    }

    try {
      const user = await User.query().where('email', email).first()
      if (user?.email) {
        // Compte pas encore activé → renvoyer une invitation
        if (!user.isActive) {
          await PasswordTokenService.sendInvite(user)
        } else {
          await PasswordTokenService.sendReset(user)
        }
      }
    } catch (error) {
      console.error('Erreur forgotPassword:', error)
    }

    return response.ok(genericMessage)
  }

  public async resetPassword({ request, response }: HttpContext) {
    const { token, password, confirmPassword } = await request.validateUsing(resetPasswordValidator)

    if (password !== confirmPassword) {
      return response.status(400).json({ message: 'Les mots de passe ne correspondent pas' })
    }

    const record = await PasswordTokenService.findValidToken(token)
    if (!record || !record.user) {
      return response.status(400).json({ message: 'Lien invalide ou expiré' })
    }

    const user = record.user

    // Invitation : activer le compte. Reset : uniquement si déjà actif.
    if (record.type === 'invite') {
      user.isActive = true
    } else if (!user.isActive) {
      return response.status(403).json({
        message:
          'Votre compte n’est pas activé. Demandez un nouveau lien d’activation depuis « Mot de passe oublié ».',
      })
    }

    user.password = password
    await user.save()
    await PasswordTokenService.consumeToken(record)
    await PasswordTokenService.invalidatePending(user.id)

    const accessToken = await User.accessTokens.create(user)
    const refreshToken = await User.refreshTokens.create(user)

    await UserActivityService.logActivity(
      Number(user.id),
      UserActivityService.ACTIONS.LOGIN,
      user.role
    )

    return response.ok({
      message:
        record.type === 'invite'
          ? 'Compte activé. Mot de passe défini avec succès.'
          : 'Mot de passe défini avec succès',
      user: user.serialize(),
      accessToken,
      refreshToken: refreshToken.value,
      type: 'bearer',
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
        type: 'bearer',
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

    await UserActivityService.logActivity(
      Number(user.id),
      UserActivityService.ACTIONS.LOGOUT,
      user.role
    )

    return response.ok({ message: 'Logged out' })
  }
}
