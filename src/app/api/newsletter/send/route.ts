import { NextRequest, NextResponse } from 'next/server'
import { sendNewsletterEmail } from '@/lib/email'
import { getAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase/admin.server'

export const dynamic = 'force-dynamic'

/**
 * Send newsletter to all active subscribers
 * This should be called by a cron job or manually by admin
 */
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Firebase Admin not configured' },
        { status: 500 }
      )
    }

    // Verify admin authorization
    const authHeader = request.headers.get('authorization')
    const expectedToken = `Bearer ${process.env.EXPORT_API_SECRET}`

    if (authHeader !== expectedToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { frequency = 'weekly', targetAudience = 'professional' } = await request.json()
    const adminDb = getAdminDb()

    // Get active subscribers for this frequency
    let subscribersQuery = adminDb
      .collection('newsletterSubscriptions')
      .where('unsubscribedAt', '==', null)
      .where('confirmedAt', '!=', null)
      .orderBy('confirmedAt', 'desc')

    if (frequency) {
      subscribersQuery = subscribersQuery.where('preferences.frequency', '==', frequency) as typeof subscribersQuery
    }

    const subscribersSnapshot = await subscribersQuery.get()
    const subscribers = subscribersSnapshot.docs.map((docSnap) => {
      const data = docSnap.data() as Record<string, any>
      return {
        email: typeof data.email === 'string' ? data.email : '',
      }
    })

    if (subscribers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscribers found',
        sent: 0,
      })
    }

    // Get recent published articles
    let articlesQuery = adminDb
      .collection('articles')
      .where('status', '==', 'published')
      .orderBy('publishedAt', 'desc')
      .limit(5)

    if (targetAudience) {
      articlesQuery = articlesQuery.where('targetAudience', '==', targetAudience) as typeof articlesQuery
    }

    const articlesSnapshot = await articlesQuery.get()
    const articles = articlesSnapshot.docs.map((docSnap) => {
      const data = docSnap.data() as Record<string, any>
      return {
        title: String(data.title || ''),
        excerpt: String(data.excerpt || ''),
        slug: String(data.slug || ''),
        coverImage: typeof data.coverImage === 'string' ? data.coverImage : undefined,
      }
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
    const subscriberEmails = subscribers.map((s) => s.email).filter(Boolean)

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
