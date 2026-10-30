import nodemailer from 'nodemailer'
import env from '#start/env'

type SendMailOptions = {
  to: string
  subject: string
  html: string
  text?: string
}

export default class MailService {
  private static getFrontendUrl() {
    return (env.get('FRONTEND_URL') || 'http://localhost:3000').replace(/\/$/, '')
  }

  private static getFromAddress() {
    return env.get('MAIL_FROM') || 'noreply@cmgainvoice.local'
  }

  private static createTransport() {
    const host = env.get('SMTP_HOST')
    if (!host) {
      return null
    }

    const user = env.get('SMTP_USER')
    return nodemailer.createTransport({
      host,
      port: Number(env.get('SMTP_PORT') || '587'),
      secure: (env.get('SMTP_SECURE') || 'false') === 'true',
      auth: user
        ? {
            user,
            pass: env.get('SMTP_PASSWORD') || '',
          }
        : undefined,
    })
  }

  static async send({ to, subject, html, text }: SendMailOptions) {
    const transport = this.createTransport()

    if (!transport) {
      console.info('[MailService] SMTP non configuré — email journalisé', {
        to,
        subject,
        text: text || html.replace(/<[^>]+>/g, ' '),
      })
      return { logged: true as const }
    }

    await transport.sendMail({
      from: this.getFromAddress(),
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ' '),
    })

    return { logged: false as const }
  }

  static buildInviteEmail(firstname: string, token: string) {
    const url = `${this.getFrontendUrl()}/definir-mot-de-passe?token=${encodeURIComponent(token)}`
    const subject = 'Activez votre compte CMGA Invoice'
    const html = `
      <p>Bonjour ${firstname || ''},</p>
      <p>Un compte a été créé pour vous. Pour l’activer, vous devez obligatoirement définir un mot de passe via le lien ci-dessous :</p>
      <p><a href="${url}">${url}</a></p>
      <p>Sans cette étape, votre compte restera inactif.</p>
      <p>Ce lien expire dans 48 heures.</p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    `
    return { subject, html, url }
  }

  static buildResetEmail(firstname: string, token: string) {
    const url = `${this.getFrontendUrl()}/definir-mot-de-passe?token=${encodeURIComponent(token)}`
    const subject = 'Réinitialisation de votre mot de passe'
    const html = `
      <p>Bonjour ${firstname || ''},</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous :</p>
      <p><a href="${url}">${url}</a></p>
      <p>Ce lien expire dans 1 heure.</p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    `
    return { subject, html, url }
  }
}
