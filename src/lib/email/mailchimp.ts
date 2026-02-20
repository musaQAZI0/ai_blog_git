import { EmailOptions } from './index'

const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY

export async function sendEmailWithMailchimp(options: EmailOptions): Promise<void> {
  if (!MAILCHIMP_API_KEY) {
    throw new Error('MAILCHIMP_API_KEY is not configured')
  }

  const { to, subject, html, from } = options

  // Mailchimp Transactional API (Mandrill)
  const emailData = {
    key: MAILCHIMP_API_KEY,
    message: {
      html,
      subject,
      from_email: from || process.env.SENDGRID_FROM_EMAIL || 'noreply@skrzypecki.pl',
      from_name: 'Skrzypecki.pl',
      to: Array.isArray(to) ? to.map((email) => ({ email, type: 'to' })) : [{ email: to, type: 'to' }],
    },
  }

  const response = await fetch(`https://mandrillapp.com/api/1.0/messages/send.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailData),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Mailchimp API error: ${error}`)
  }
}
