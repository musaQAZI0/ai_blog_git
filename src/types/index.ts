// User Types
export type UserRole = 'patient' | 'professional' | 'admin'
export type ProfessionalType = 'lekarz' | 'optometrysta' | 'other'
export type UserStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  id: string
  email: string
  name: string
  phoneNumber?: string
  role: UserRole
  professionalType?: ProfessionalType
  otherProfessionalType?: string
  registrationNumber?: string
  specialization?: string
  status: UserStatus
  createdAt: Date
  updatedAt: Date
  newsletterSubscribed: boolean
  gdprConsent: boolean
  gdprConsentDate?: Date
}

export interface UserRegistrationData {
  email: string
  password: string
  name: string
  phoneNumber: string
  professionalType: ProfessionalType
  otherProfessionalType?: string
  registrationNumber: string
  specialization?: string
  gdprConsent: boolean
  newsletterConsent?: boolean
}

// Article Types
export type ArticleStatus = 'draft' | 'published' | 'archived'
export type TargetAudience = 'patient' | 'professional'

export interface SEOMeta {
  title: string
  description: string
  keywords: string[]
  ogImage?: string
}

export interface Article {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  coverImage?: string
  category?: string
  targetAudience: TargetAudience
  authorId: string
  authorName: string
  status: ArticleStatus
  seoMeta: SEOMeta
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
  viewCount: number
  tags: string[]
}

export interface ArticleCreateData {
  title: string
  content: string
  excerpt: string
  coverImage?: string
  category?: string
  targetAudience: TargetAudience
  seoMeta: SEOMeta
  tags: string[]
}

// AI Generation Types
export type AIProvider = 'openai' | 'claude' | 'gemini'

export interface AIGenerationRequest {
  pdfContent: string
  targetAudience: TargetAudience
  provider: AIProvider
  generateImage: boolean
}

export interface AIGenerationResponse {
  title: string
  content: string
  excerpt: string
  seoMeta: SEOMeta
  suggestedTags: string[]
  suggestedCategory: string
  generatedImageUrl?: string
}

// Analytics Types
export interface ArticleView {
  articleId: string
  userId?: string
  timestamp: Date
  userAgent: string
  ipHash: string
}

export interface AnalyticsSummary {
  totalViews: number
  uniqueViews: number
  topArticles: {
    articleId: string
    title: string
    views: number
  }[]
  viewsByDay: {
    date: string
    views: number
  }[]
}

// Newsletter Types
export interface NewsletterSubscription {
  id: string
  userId: string
  email: string
  subscribedAt: Date
  confirmedAt?: Date
  unsubscribedAt?: Date
  preferences: {
    frequency: 'daily' | 'weekly' | 'monthly'
    categories: string[]
  }
}

// Admin Types
export interface PendingApproval {
  userId: string
  userData: Omit<User, 'id' | 'status'>
  submittedAt: Date
  reviewedBy?: string
  reviewedAt?: Date
  reviewNotes?: string
}

// GDPR Types
export interface GDPRConsent {
  userId: string
  consentType: 'cookies' | 'newsletter' | 'dataProcessing'
  consented: boolean
  consentedAt: Date
  ipHash: string
}

export interface GDPRExportRequest {
  userId: string
  requestedAt: Date
  completedAt?: Date
  downloadUrl?: string
}

// API Response Types
export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Form Types
export interface LoginFormData {
  email: string
  password: string
}

export interface ContactFormData {
  name: string
  email: string
  message: string
}
