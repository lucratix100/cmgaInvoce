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

  private static getBrandName() {
    return env.get('MAIL_BRAND_NAME') || 'CMGA Invoice'
  }

  private static createTransport() {
    const host = env.get('SMTP_HOST')
    if (!host) {
      return null
    }

    const port = Number(env.get('SMTP_PORT') || '587')
    const secure = (env.get('SMTP_SECURE') || 'false') === 'true'
    const user = env.get('SMTP_USER')
    const pass = env.get('SMTP_PASSWORD') || ''

    return nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: !secure && port === 587,
      auth: user
        ? {
            user,
            pass,
          }
        : undefined,
      tls: {
        // Serveurs SMTP internes / certificats auto-signés
        rejectUnauthorized: false,
      },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 20000,
    })
  }

  static async send({ to, subject, html, text }: SendMailOptions) {
    const transport = this.createTransport()

    if (!transport) {
      const err = new Error(
        'SMTP non configuré (SMTP_HOST manquant). Impossible d’envoyer l’email.'
      )
      ;(err as any).code = 'SMTP_NOT_CONFIGURED'
      throw err
    }

    const plainText = text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

    try {
      const info = await transport.sendMail({
        from: `"${this.getBrandName()}" <${this.getFromAddress()}>`,
        to,
        subject,
        html,
        text: plainText,
      })

      if (info.rejected?.length) {
        throw new Error(`Destinataire refusé par le serveur SMTP: ${info.rejected.join(', ')}`)
      }

      console.info('[MailService] Email envoyé', {
        to,
        subject,
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
      })

      return {
        logged: false as const,
        messageId: info.messageId,
        response: info.response,
      }
    } catch (error: any) {
      console.error('[MailService] Échec envoi email', {
        to,
        subject,
        code: error?.code,
        command: error?.command,
        response: error?.response,
        message: error?.message,
      })
      throw error
    }
  }

  private static escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  private static wrapLayout(options: {
    preheader: string
    title: string
    greeting: string
    bodyHtml: string
    ctaLabel: string
    ctaUrl: string
    footnote: string
  }) {
    const brand = this.getBrandName()
    const year = new Date().getFullYear()
    const safeTitle = this.escapeHtml(options.title)
    const safeGreeting = this.escapeHtml(options.greeting)
    const safeCta = this.escapeHtml(options.ctaLabel)
    const safeUrl = this.escapeHtml(options.ctaUrl)
    const safePreheader = this.escapeHtml(options.preheader)
    const safeFootnote = this.escapeHtml(options.footnote)

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#eef3f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${safePreheader}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eef3f9;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0b5fff 0%,#0047c7 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.85);font-weight:600;margin-bottom:8px;">
                ${this.escapeHtml(brand)}
              </div>
              <div style="font-size:24px;line-height:1.3;font-weight:700;color:#ffffff;">
                ${safeTitle}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 12px 32px;">
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#111827;">
                ${safeGreeting}
              </p>
              ${options.bodyHtml}
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 8px 0;">
                <tr>
                  <td align="center" bgcolor="#0b5fff" style="border-radius:10px;">
                    <a href="${safeUrl}"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;background-color:#0b5fff;">
                      ${safeCta}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
                Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur&nbsp;:<br />
                <a href="${safeUrl}" style="color:#0b5fff;word-break:break-all;">${safeUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 28px 32px;">
              <div style="border-top:1px solid #e5e7eb;padding-top:18px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
                  ${safeFootnote}
                </p>
              </div>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin-top:16px;">
          <tr>
            <td align="center" style="font-size:12px;line-height:1.6;color:#9ca3af;padding:0 12px;">
              © ${year} ${this.escapeHtml(brand)}. Tous droits réservés.<br />
              Cet email a été envoyé automatiquement, merci de ne pas y répondre.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  }

  static buildInviteEmail(firstname: string, token: string) {
    const url = `${this.getFrontendUrl()}/definir-mot-de-passe?token=${encodeURIComponent(token)}`
    const name = (firstname || '').trim() || 'utilisateur'
    const subject = `Activez votre compte ${this.getBrandName()}`

    const bodyHtml = `
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
        Un compte vient d’être créé pour vous sur <strong>${this.escapeHtml(this.getBrandName())}</strong>.
      </p>
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
        Pour l’activer, vous devez <strong>obligatoirement définir un mot de passe</strong>.
        Sans cette étape, votre compte restera inactif.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0;background-color:#f0f7ff;border:1px solid #dbeafe;border-radius:12px;">
        <tr>
          <td style="padding:14px 16px;font-size:13px;line-height:1.6;color:#1e40af;">
            ⏱ Ce lien d’activation est valable <strong>48 heures</strong>.
          </td>
        </tr>
      </table>
    `

    const html = this.wrapLayout({
      preheader: 'Définissez votre mot de passe pour activer votre compte.',
      title: 'Bienvenue — activez votre compte',
      greeting: `Bonjour ${name},`,
      bodyHtml,
      ctaLabel: 'Définir mon mot de passe',
      ctaUrl: url,
      footnote:
        "Si vous n’êtes pas à l’origine de cette création de compte, ignorez simplement cet email. Aucune action ne sera effectuée.",
    })

    const text = [
      `Bonjour ${name},`,
      '',
      `Un compte a été créé pour vous sur ${this.getBrandName()}.`,
      'Pour l’activer, définissez obligatoirement un mot de passe via ce lien :',
      url,
      '',
      'Ce lien expire dans 48 heures.',
      'Sans cette étape, votre compte restera inactif.',
      '',
      "Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.",
    ].join('\n')

    return { subject, html, text, url }
  }

  static buildResetEmail(firstname: string, token: string) {
    const url = `${this.getFrontendUrl()}/definir-mot-de-passe?token=${encodeURIComponent(token)}`
    const name = (firstname || '').trim() || 'utilisateur'
    const subject = `Réinitialisation de votre mot de passe — ${this.getBrandName()}`

    const bodyHtml = `
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
        Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte
        <strong>${this.escapeHtml(this.getBrandName())}</strong>.
      </p>
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">
        Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe et vous reconnecter.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0;background-color:#fff7ed;border:1px solid #fed7aa;border-radius:12px;">
        <tr>
          <td style="padding:14px 16px;font-size:13px;line-height:1.6;color:#9a3412;">
            ⏱ Ce lien est valable <strong>1 heure</strong> seulement pour des raisons de sécurité.
          </td>
        </tr>
      </table>
    `

    const html = this.wrapLayout({
      preheader: 'Réinitialisez votre mot de passe en toute sécurité.',
      title: 'Réinitialisation du mot de passe',
      greeting: `Bonjour ${name},`,
      bodyHtml,
      ctaLabel: 'Réinitialiser mon mot de passe',
      ctaUrl: url,
      footnote:
        "Si vous n’avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe actuel reste inchangé.",
    })

    const text = [
      `Bonjour ${name},`,
      '',
      'Vous avez demandé la réinitialisation de votre mot de passe.',
      'Utilisez ce lien pour en définir un nouveau :',
      url,
      '',
      'Ce lien expire dans 1 heure.',
      '',
      "Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.",
    ].join('\n')

    return { subject, html, text, url }
  }
}
