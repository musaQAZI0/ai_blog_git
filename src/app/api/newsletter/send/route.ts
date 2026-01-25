import { NextRequest, NextResponse } from 'next/server'
import { getAllActiveSubscribers } from '@/lib/firebase/newsletter'
import { getArticles } from '@/lib/firebase/articles'
import { sendNewsletterEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

/**
 * Send newsletter to all active subscribers
 * This should be called by a cron job or manually by admin
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    const authHeader = request.headers.get('authorization')
    const expectedToken = `Bearer ${process.env.EXPORT_API_SECRET}`

    if (authHeader !== expectedToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { frequency = 'weekly', targetAudience = 'professional' } = await request.json()

    // Get active subscribers for this frequency
    const subscribers = await getAllActiveSubscribers(frequency)

    if (subscribers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscribers found',
        sent: 0,
      })
    }

    // Get recent published articles
    const { articles } = await getArticles({
      targetAudience,
      status: 'published',
      pageSize: 5, // Top 5 articles
    })

    if (articles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No articles available for newsletter',
      })
    }

    // Format articles for email
    const formattedArticles = articles.map((article) => ({
      title: article.title,
      excerpt: article.excerpt,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/${targetAudience}/${article.slug}`,
      imageUrl: article.coverImage,
    }))

    // Send newsletter to all subscribers
    const subscriberEmails = subscribers.map((s) => s.email)

    await sendNewsletterEmail({
      to: subscriberEmails,
      subject: `Skrzypecki.pl Newsletter - ${new Date().toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}`,
      articles: formattedArticles,
    })

    return NextResponse.json({
      success: true,
      message: 'Newsletter sent successfully',
      sent: subscriberEmails.length,
      articles: articles.length,
    })
  } catch (error) {
    console.error('Newsletter send error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send newsletter',
      },
      { status: 500 }
    )
  }
}
