import { sendEmailWithSendGrid } from './sendgrid'
import { sendEmailWithMailchimp } from './mailchimp'
import { sendEmailWithSES } from './ses'

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

export interface ApprovalEmailData {
  to: string
  name: string
  approved: boolean
  reason?: string
}

export interface NewsletterEmailData {
  to: string[]
  subject: string
  articles: Array<{
    title: string
    excerpt: string
    url: string
    imageUrl?: string
  }>
  recipientName?: string
}

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'sendgrid' // sendgrid, mailchimp, or ses

/**
 * Send an email using the configured provider
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    switch (EMAIL_PROVIDER) {
      case 'sendgrid':
        await sendEmailWithSendGrid(options)
        break
      case 'mailchimp':
        await sendEmailWithMailchimp(options)
        break
      case 'ses':
        await sendEmailWithSES(options)
        break
      default:
        console.warn(`Email provider "${EMAIL_PROVIDER}" not configured, email not sent`)
    }
  } catch (error) {
    console.error('Failed to send email:', error)
    throw error
  }
}

/**
 * Send approval/rejection email to user
 */
export async function sendApprovalEmail(data: ApprovalEmailData): Promise<void> {
  const { to, name, approved, reason } = data

  const subject = approved
    ? 'Twoje konto zostało zatwierdzone'
    : 'Aktualizacja statusu twojego konta'

  const html = approved
    ? `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Konto zatwierdzone!</h1>
            </div>
            <div class="content">
              <p>Witaj ${name},</p>
              <p>Miło nam poinformować, że Twoje konto specjalisty zostało zatwierdzone!</p>
              <p>Możesz teraz zalogować się i uzyskać dostęp do specjalistycznych treści medycznych na portalu <strong>www.skrzypecki.pl</strong>.</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" class="button">Zaloguj się</a>
              </p>
              <p>Jeśli masz jakiekolwiek pytania, skontaktuj się z nami pod adresem ${process.env.ADMIN_EMAIL}.</p>
              <p>Pozdrawiamy,<br>Zespół Skrzypecki.pl</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Skrzypecki.pl. Wszystkie prawa zastrzeżone.</p>
            </div>
          </div>
        </body>
      </html>
    `
    : `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Aktualizacja statusu konta</h1>
            </div>
            <div class="content">
              <p>Witaj ${name},</p>
              <p>Dziękujemy za zainteresowanie portalem www.skrzypecki.pl.</p>
              <p>Niestety, nie mogliśmy zweryfikować Twojego konta specjalisty w tym momencie.</p>
              ${reason ? `<p><strong>Powód:</strong> ${reason}</p>` : ''}
              <p>Jeśli uważasz, że to pomyłka lub chciałbyś ponownie złożyć wniosek, skontaktuj się z nami pod adresem ${process.env.ADMIN_EMAIL}.</p>
              <p>Pozdrawiamy,<br>Zespół Skrzypecki.pl</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Skrzypecki.pl. Wszystkie prawa zastrzeżone.</p>
            </div>
          </div>
        </body>
      </html>
    `

  await sendEmail({
    to,
    subject,
    html,
    from: process.env.SENDGRID_FROM_EMAIL || process.env.AWS_SES_FROM_EMAIL,
  })
}

/**
 * Send newsletter email
 */
export async function sendNewsletterEmail(data: NewsletterEmailData): Promise<void> {
  const { to, subject, articles, recipientName } = data

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #3b82f6; color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 20px; }
          .article { margin-bottom: 30px; padding-bottom: 30px; border-bottom: 1px solid #e5e7eb; }
          .article:last-child { border-bottom: none; }
          .article-image { width: 100%; max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 15px; }
          .article-title { font-size: 20px; font-weight: bold; margin: 0 0 10px 0; }
          .article-title a { color: #1f2937; text-decoration: none; }
          .article-excerpt { color: #4b5563; margin: 10px 0; }
          .read-more { display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px; }
          .footer { text-align: center; padding: 30px 20px; color: #6b7280; font-size: 14px; background: #f9fafb; }
          .footer a { color: #3b82f6; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Skrzypecki.pl Newsletter</h1>
            <p>Najnowsze artykuły medyczne</p>
          </div>
          <div class="content">
            ${recipientName ? `<p>Witaj ${recipientName},</p>` : '<p>Witaj,</p>'}
            <p>Oto najnowsze artykuły z naszego portalu:</p>

            ${articles
              .map(
                (article) => `
              <div class="article">
                ${article.imageUrl ? `<img src="${article.imageUrl}" alt="${article.title}" class="article-image">` : ''}
                <h2 class="article-title">
                  <a href="${article.url}">${article.title}</a>
                </h2>
                <p class="article-excerpt">${article.excerpt}</p>
                <a href="${article.url}" class="read-more">Czytaj więcej</a>
              </div>
            `
              )
              .join('')}
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Skrzypecki.pl. Wszystkie prawa zastrzeżone.</p>
            <p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/newsletter/unsubscribe">Wypisz się z newslettera</a> |
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/privacy">Polityka prywatności</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `

  // Send emails in batches to avoid rate limiting
  const batchSize = 50
  for (let i = 0; i < to.length; i += batchSize) {
    const batch = to.slice(i, i + batchSize)
    await sendEmail({
      to: batch,
      subject,
      html,
      from: process.env.SENDGRID_FROM_EMAIL || process.env.AWS_SES_FROM_EMAIL,
    })
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f9fafb; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Witamy w Skrzypecki.pl!</h1>
          </div>
          <div class="content">
            <p>Witaj ${name},</p>
            <p>Dziękujemy za rejestrację na portalu <strong>www.skrzypecki.pl</strong>.</p>
            <p>Twoje konto oczekuje na weryfikację przez nasz zespół. Otrzymasz powiadomienie email, gdy Twoje konto zostanie zatwierdzone.</p>
            <p>Proces weryfikacji zwykle trwa 24-48 godzin.</p>
            <p>Jeśli masz jakiekolwiek pytania, skontaktuj się z nami pod adresem ${process.env.ADMIN_EMAIL}.</p>
            <p>Pozdrawiamy,<br>Zespół Skrzypecki.pl</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Skrzypecki.pl. Wszystkie prawa zastrzeżone.</p>
          </div>
        </div>
      </body>
    </html>
  `

  await sendEmail({
    to: email,
    subject: 'Witamy w Skrzypecki.pl - Weryfikacja konta',
    html,
    from: process.env.SENDGRID_FROM_EMAIL || process.env.AWS_SES_FROM_EMAIL,
  })
}
