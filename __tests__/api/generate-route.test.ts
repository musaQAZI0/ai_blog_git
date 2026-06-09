/**
 * API Tests for /api/ai/generate Route
 * Tests HTTP endpoints, request handling, and response formats
 */

import { POST } from '@/app/api/ai/generate/route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/ai', () => ({
  generateArticle: jest.fn().mockResolvedValue({
    success: true,
    data: {
      title: 'Test Article',
      content: '## Section\n\nContent.\n\n## Źródło\n\nSource.',
      excerpt: 'Test excerpt',
      coverImageUrl: 'https://example.com/cover.jpg',
      figures: [],
      charts: [],
      seoMeta: {
        title: 'SEO Title',
        description: 'SEO Description',
        keywords: ['keyword1', 'keyword2'],
      },
      suggestedTags: ['tag1', 'tag2'],
      suggestedCategory: 'IOL',
      targetAudience: 'professional',
      provider: 'gemini',
    },
  }),
}))

jest.mock('@/lib/ai/pdf-parser', () => ({
  extractTextFromMultiplePDFs: jest.fn().mockResolvedValue('Mocked PDF text content'),
}))

jest.mock('@/lib/ai/pdf-text-normalizer', () => ({
  normalizeExtractedPdfText: jest.fn((text) => text),
}))

jest.mock('@/lib/auth/server', () => ({
  getRequestUser: jest.fn().mockResolvedValue({ role: 'admin', id: 'test-user' }),
}))

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn(() => ({ ok: true })),
}))

describe('API Route: /api/ai/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST - Article Generation', () => {
    it('should generate article successfully with multipart form data', async () => {
      const formData = new FormData()
      formData.append('targetAudience', 'professional')
      formData.append('provider', 'gemini')
      formData.append('generateImage', 'true')
      formData.append('generationMode', 'full')

      // Create a fake PDF file
      const pdfBlob = new Blob(['fake pdf content'], { type: 'application/pdf' })
      formData.append('files', pdfBlob, 'test.pdf')

      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toBeDefined()
      expect(json.data.title).toBeTruthy()
    })

    it('should generate article with JSON body and pdfContent', async () => {
      const body = {
        pdfContent: 'Test PDF content from text',
        targetAudience: 'professional',
        provider: 'gemini',
        generateImage: true,
        generationMode: 'full',
      }

      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })

    it('should support extract action for PDF text extraction only', async () => {
      const body = {
        action: 'extract',
        pdfContent: 'Test PDF content',
        targetAudience: 'professional',
      }

      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.pdfContent).toBeDefined()
      expect(json.data.stats).toBeDefined()
    })
  })

  describe('POST - Request Deduplication', () => {
    it('should deduplicate identical concurrent requests', async () => {
      const generateArticle = require('@/lib/ai').generateArticle
      generateArticle.mockClear()

      const body = {
        pdfContent: 'Identical PDF content for deduplication test',
        targetAudience: 'professional',
        provider: 'gemini',
        generateImage: true,
        generationMode: 'full',
      }

      const request1 = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const request2 = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      // Send concurrent requests
      const [response1, response2] = await Promise.all([POST(request1), POST(request2)])

      const json1 = await response1.json()
      const json2 = await response2.json()

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      expect(json1.success).toBe(true)
      expect(json2.success).toBe(true)

      // One should be deduplicated
      const deduplicatedCount = [json1, json2].filter((j) => j.deduplicated).length
      expect(deduplicatedCount).toBe(1)

      // generateArticle should only be called once (deduplication works)
      expect(generateArticle.mock.calls.length).toBe(1)
    })
  })

  describe('POST - Error Handling', () => {
    it('should return 401 for guest users', async () => {
      const getRequestUser = require('@/lib/auth/server').getRequestUser
      getRequestUser.mockResolvedValueOnce({ role: 'guest', id: null })

      const body = {
        pdfContent: 'Test content',
        targetAudience: 'professional',
        provider: 'gemini',
      }

      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('should return 429 when rate limit exceeded', async () => {
      const rateLimit = require('@/lib/rate-limit').rateLimit
      rateLimit.mockReturnValueOnce({ ok: false })

      const body = {
        pdfContent: 'Test content',
        targetAudience: 'professional',
        provider: 'gemini',
      }

      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(request)
      expect(response.status).toBe(429)
    })

    it('should return 400 for missing targetAudience', async () => {
      const body = {
        pdfContent: 'Test content',
        provider: 'gemini',
        // Missing targetAudience
      }

      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should return 400 for insufficient PDF content', async () => {
      const normalizeExtractedPdfText = require('@/lib/ai/pdf-text-normalizer')
        .normalizeExtractedPdfText
      normalizeExtractedPdfText.mockReturnValueOnce('Short') // < 100 chars

      const body = {
        pdfContent: 'Too short',
        targetAudience: 'professional',
        provider: 'gemini',
      }

      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should return 500 for AI generation errors', async () => {
      const generateArticle = require('@/lib/ai').generateArticle
      generateArticle.mockRejectedValueOnce(new Error('AI provider timeout'))

      const body = {
        pdfContent: 'Test content that will cause error',
        targetAudience: 'professional',
        provider: 'gemini',
      }

      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
    })
  })

  describe('POST - Provider Selection', () => {
    it('should accept gemini provider', async () => {
      const body = {
        pdfContent: 'Test content',
        targetAudience: 'professional',
        provider: 'gemini',
      }

      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should accept openai provider', async () => {
      const body = {
        pdfContent: 'Test content',
        targetAudience: 'professional',
        provider: 'openai',
      }

      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should accept claude provider', async () => {
      const body = {
        pdfContent: 'Test content',
        targetAudience: 'professional',
        provider: 'claude',
      }

      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should default to gemini for invalid provider', async () => {
      const body = {
        pdfContent: 'Test content',
        targetAudience: 'professional',
        provider: 'invalid-provider',
      }

      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(request)
      // Should still work with default provider
      expect(response.status).toBe(200)
    })
  })

  describe('POST - Generation Modes', () => {
    it('should support full generation mode', async () => {
      const body = {
        pdfContent: 'Test content',
        targetAudience: 'professional',
        provider: 'gemini',
        generationMode: 'full',
      }

      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should support fast generation mode', async () => {
      const body = {
        pdfContent: 'Test content',
        targetAudience: 'professional',
        provider: 'gemini',
        generationMode: 'fast',
      }

      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })
})
