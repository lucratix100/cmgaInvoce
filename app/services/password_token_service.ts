import { createHash, randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import PasswordResetToken, { type PasswordTokenType } from '#models/password_reset_token'
import User from '#models/user'
import MailService from '#services/mail_service'

export default class PasswordTokenService {
  static hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
  }

  static async invalidatePending(userId: number | string, type?: PasswordTokenType) {
    const query = PasswordResetToken.query()
      .where('user_id', userId)
      .whereNull('used_at')
      .where('expires_at', '>', DateTime.now().toISO()!)

    if (type) {
      query.where('type', type)
    }

    const tokens = await query
    for (const token of tokens) {
      token.usedAt = DateTime.now()
      await token.save()
    }
  }

  static async createToken(
    user: User,
    type: PasswordTokenType,
    expiresInHours: number
  ): Promise<string> {
    await this.invalidatePending(user.id, type)

    const rawToken = randomBytes(32).toString('hex')
    await PasswordResetToken.create({
      userId: Number(user.id),
      tokenHash: this.hashToken(rawToken),
      type,
      expiresAt: DateTime.now().plus({ hours: expiresInHours }),
      usedAt: null,
    })

    return rawToken
  }

  static async sendInvite(user: User) {
    if (!user.email) {
      throw new Error("L'utilisateur n'a pas d'email")
    }

    const token = await this.createToken(user, 'invite', 48)
    const { subject, html, url } = MailService.buildInviteEmail(user.firstname, token)
    const result = await MailService.send({ to: user.email, subject, html })

    return { token, url, ...result }
  }

  static async sendReset(user: User) {
    if (!user.email) {
      throw new Error("L'utilisateur n'a pas d'email")
    }

    const token = await this.createToken(user, 'reset', 1)
    const { subject, html, url } = MailService.buildResetEmail(user.firstname, token)
    const result = await MailService.send({ to: user.email, subject, html })

    return { token, url, ...result }
  }

  static async findValidToken(rawToken: string) {
    const tokenHash = this.hashToken(rawToken)
    const record = await PasswordResetToken.query()
      .where('token_hash', tokenHash)
      .whereNull('used_at')
      .where('expires_at', '>', DateTime.now().toISO()!)
      .preload('user')
      .first()

    return record
  }

  static async consumeToken(record: PasswordResetToken) {
    record.usedAt = DateTime.now()
    await record.save()
  }
}
