import { EmailOptions } from './index'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL

export async function sendEmailWithSendGrid(options: EmailOptions): Promise<void> {
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not configured')
  }

  const { to, subject, html, text, from, replyTo } = options

  const emailData = {
    personalizations: [
      {
        to: Array.isArray(to) ? to.map((email) => ({ email })) : [{ email: to }],
        subject,
      },
    ],
    from: {
      email: from || SENDGRID_FROM_EMAIL || 'noreply@skrzypecki.pl',
      name: 'Skrzypecki.pl',
    },
    content: [
      {
        type: 'text/html',
        value: html,
      },
      ...(text
        ? [
            {
              type: 'text/plain',
              value: text,
            },
          ]
        : []),
    ],
    ...(replyTo && { reply_to: { email: replyTo } }),
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
    },
    body: JSON.stringify(emailData),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`SendGrid API error: ${error}`)
  }
}
