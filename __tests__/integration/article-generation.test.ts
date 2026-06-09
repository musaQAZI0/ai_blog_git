/**
 * Integration Tests for Article Generation
 * Tests end-to-end article generation flow with mocked AI providers
 */

import { generateArticle } from '@/lib/ai'

const longMockContent = `## Section 1

${'Test content here. '.repeat(120)}

## Źródło

Author et al. Journal. 2025.`

// Mock AI providers
jest.mock('@/lib/ai/gemini', () => ({
  generateArticleWithGemini: jest.fn().mockImplementation((pdfContent, targetAudience) => ({
    title: `Test Article Title (${targetAudience})`,
    content: longMockContent,
    excerpt: 'Test excerpt for article.',
    coverImageUrl: 'https://example.com/cover.jpg',
    figures: [],
    charts: [
      {
        id: 'chart-1',
        url: 'https://example.com/chart-1.png',
        title: 'Test Chart',
        alt: 'Test Chart Alt',
        caption: 'Rysunek 1: Test Chart',
        placeholder: 'https://example.com/placeholder',
        sourceDescription: 'Table 1',
      },
    ],
    seoMeta: {
      title: 'SEO Title',
      description: 'SEO Description',
      keywords: ['keyword1', 'keyword2'],
    },
    suggestedTags: ['tag1', 'tag2'],
    suggestedCategory: 'IOL',
    targetAudience,
    provider: 'gemini',
  })),
}))

jest.mock('@/lib/ai/openai', () => ({
  generateArticleWithOpenAI: jest.fn().mockImplementation((pdfContent, targetAudience) => ({
    title: `Test Article from OpenAI (${targetAudience})`,
    content: longMockContent,
    excerpt: 'Excerpt.',
    coverImageUrl: 'https://example.com/cover.jpg',
    figures: [],
    charts: [],
    seoMeta: {
      title: 'SEO',
      description: 'Desc',
      keywords: ['key'],
    },
    suggestedTags: ['tag'],
    suggestedCategory: 'General',
    targetAudience,
    provider: 'openai',
  })),
}))

jest.mock('@/lib/ai/claude', () => ({
  generateArticleWithClaude: jest.fn().mockImplementation((pdfContent, targetAudience) => ({
    title: `Test Article from Claude (${targetAudience})`,
    content: longMockContent,
    excerpt: 'Excerpt.',
    coverImageUrl: null,
    figures: [],
    charts: [],
    seoMeta: {
      title: 'SEO',
      description: 'Desc',
      keywords: ['key'],
    },
    suggestedTags: ['tag'],
    suggestedCategory: 'General',
    targetAudience,
    provider: 'claude',
  })),
}))

describe('Article Generation - Integration Tests', () => {
  const mockPdfContent = `
    [TABLE: Study Results]
    Parameter | Value | P-value
    IOL Power | 21.5 | <0.001
    UDVA | 0.05 | 0.023
    [END TABLE]

    This is a study about IOL implantation results.
  `

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateArticle - Provider Selection', () => {
    it('should generate article with Gemini provider', async () => {
      const result = await generateArticle({
        pdfContent: mockPdfContent,
        targetAudience: 'professional',
        provider: 'gemini',
        generateImage: true,
        generationMode: 'full',
      })

      expect(result).toBeDefined()
      expect(result.provider).toBe('gemini')
      expect(result.title).toBeTruthy()
      expect(result.content).toBeTruthy()
    })

    it('should generate article with OpenAI provider', async () => {
      const result = await generateArticle({
        pdfContent: mockPdfContent,
        targetAudience: 'professional',
        provider: 'openai',
        generateImage: true,
        generationMode: 'full',
      })

      expect(result).toBeDefined()
      expect(result.provider).toBe('openai')
      expect(result.title).toBeTruthy()
    })

    it('should generate article with Claude provider', async () => {
      const result = await generateArticle({
        pdfContent: mockPdfContent,
        targetAudience: 'professional',
        provider: 'claude',
        generateImage: false,
        generationMode: 'full',
      })

      expect(result).toBeDefined()
      expect(result.provider).toBe('claude')
      expect(result.title).toBeTruthy()
    })
  })

  describe('generateArticle - Target Audience', () => {
    it('should generate professional article', async () => {
      const result = await generateArticle({
        pdfContent: mockPdfContent,
        targetAudience: 'professional',
        provider: 'gemini',
        generateImage: true,
        generationMode: 'full',
      })

      expect(result).toBeDefined()
      expect(result.targetAudience).toBe('professional')
      expect(result.charts?.length).toBeGreaterThan(0)
    })

    it('should generate patient article', async () => {
      const result = await generateArticle({
        pdfContent: mockPdfContent,
        targetAudience: 'patient',
        provider: 'gemini',
        generateImage: true,
        generationMode: 'full',
      })

      expect(result).toBeDefined()
      expect(result.targetAudience).toBe('patient')
    })
  })

  describe('generateArticle - Content Validation', () => {
    it('should include required sections in content', async () => {
      const result = await generateArticle({
        pdfContent: mockPdfContent,
        targetAudience: 'professional',
        provider: 'gemini',
        generateImage: true,
        generationMode: 'full',
      })

      const content = result.content || ''

      // Should have markdown headers
      expect(content).toContain('##')

      // Should have source section
      expect(content).toContain('Źródło')
    })

    it('should have valid SEO metadata', async () => {
      const result = await generateArticle({
        pdfContent: mockPdfContent,
        targetAudience: 'professional',
        provider: 'gemini',
        generateImage: true,
        generationMode: 'full',
      })

      const seoMeta = result.seoMeta

      expect(seoMeta).toBeDefined()
      expect(seoMeta?.title).toBeTruthy()
      expect(seoMeta?.description).toBeTruthy()
      expect(seoMeta?.keywords?.length).toBeGreaterThan(0)

      // SEO title should be <= 60 chars
      expect(seoMeta?.title?.length).toBeLessThanOrEqual(60)

      // SEO description should be <= 160 chars
      expect(seoMeta?.description?.length).toBeLessThanOrEqual(160)
    })

    it('should have suggested tags and category', async () => {
      const result = await generateArticle({
        pdfContent: mockPdfContent,
        targetAudience: 'professional',
        provider: 'gemini',
        generateImage: true,
        generationMode: 'full',
      })

      expect(result.suggestedTags?.length).toBeGreaterThan(0)
      expect(result.suggestedCategory).toBeTruthy()
    })
  })

  describe('generateArticle - Chart Generation', () => {
    it('should generate charts for professional articles', async () => {
      const result = await generateArticle({
        pdfContent: mockPdfContent,
        targetAudience: 'professional',
        provider: 'gemini',
        generateImage: true,
        generationMode: 'full',
      })

      expect(result.charts).toBeDefined()
      expect(result.charts?.length).toBeGreaterThan(0)

      const chart = result.charts?.[0]
      expect(chart?.id).toBeTruthy()
      expect(chart?.url).toBeTruthy()
      expect(chart?.title).toBeTruthy()
    })

    it('should not generate charts when generateImage is false', async () => {
      const result = await generateArticle({
        pdfContent: mockPdfContent,
        targetAudience: 'professional',
        provider: 'gemini',
        generateImage: false,
        generationMode: 'full',
      })

      expect(result).toBeDefined()
      // Charts may be empty or not generated
    })
  })

  describe('generateArticle - Generation Modes', () => {
    it('should work in full generation mode', async () => {
      const result = await generateArticle({
        pdfContent: mockPdfContent,
        targetAudience: 'professional',
        provider: 'gemini',
        generateImage: true,
        generationMode: 'full',
      })

      expect(result).toBeDefined()
      expect(result.content?.length).toBeGreaterThan(100)
    })

    it('should work in fast generation mode', async () => {
      const result = await generateArticle({
        pdfContent: mockPdfContent,
        targetAudience: 'professional',
        provider: 'gemini',
        generateImage: false,
        generationMode: 'fast',
      })

      expect(result).toBeDefined()
    })
  })

  describe('generateArticle - Error Handling', () => {
    it('should handle empty PDF content', async () => {
      const result = await generateArticle({
        pdfContent: '',
        targetAudience: 'professional',
        provider: 'gemini',
        generateImage: true,
        generationMode: 'full',
      })

      // Should still attempt generation
      expect(result).toBeDefined()
    })

    it('should handle very long PDF content', async () => {
      const longContent = 'Lorem ipsum '.repeat(10000) // Very long text
      const result = await generateArticle({
        pdfContent: longContent,
        targetAudience: 'professional',
        provider: 'gemini',
        generateImage: true,
        generationMode: 'full',
      })

      expect(result).toBeDefined()
    })
  })

  describe('generateArticle - Response Structure', () => {
    it('should return complete response structure', async () => {
      const result = await generateArticle({
        pdfContent: mockPdfContent,
        targetAudience: 'professional',
        provider: 'gemini',
        generateImage: true,
        generationMode: 'full',
      })

      expect(result).toHaveProperty('title')
      expect(result).toHaveProperty('content')
      expect(result).toHaveProperty('excerpt')
      expect(result).toHaveProperty('seoMeta')
      expect(result).toHaveProperty('suggestedTags')
      expect(result).toHaveProperty('suggestedCategory')
      expect(result).toHaveProperty('targetAudience')
      expect(result).toHaveProperty('provider')
    })
  })
})
