/**
 * Unit Tests for PDF Parser
 * Tests PDF parsing, caching, and text extraction
 */

import { clearPdfCache, extractTextFromPDF, extractTextFromMultiplePDFs } from '@/lib/ai/pdf-parser'

// Mock pdf-parse
jest.mock('pdf-parse', () => {
  return jest.fn().mockImplementation((buffer) => {
    const input = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer)
    return Promise.resolve({
      text: `Mocked PDF text content from buffer: ${input}`,
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: {},
      version: '1.0',
    })
  })
})

describe('PDF Parser - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    clearPdfCache()
  })

  describe('extractTextFromPDF', () => {
    it('should extract text from PDF buffer successfully', async () => {
      const buffer = Buffer.from('fake-pdf-content')
      const text = await extractTextFromPDF(buffer)

      expect(text).toContain('Mocked PDF text content')
      expect(typeof text).toBe('string')
    })

    it('should cache parsed PDF text', async () => {
      const pdfParse = require('pdf-parse')
      const buffer = Buffer.from('test-pdf-for-caching')

      // First call - should parse
      const text1 = await extractTextFromPDF(buffer)
      const firstCallCount = pdfParse.mock.calls.length

      // Second call with same buffer - should use cache
      const text2 = await extractTextFromPDF(buffer)

      // Should return same text
      expect(text1).toBe(text2)

      // Should not call pdf-parse again (cache hit)
      expect(pdfParse.mock.calls.length).toBe(firstCallCount)
    })

    it('should parse different PDFs separately', async () => {
      const pdfParse = require('pdf-parse')
      pdfParse.mockClear()

      const buffer1 = Buffer.from('pdf-content-1')
      const buffer2 = Buffer.from('pdf-content-2')

      const text1 = await extractTextFromPDF(buffer1)
      const text2 = await extractTextFromPDF(buffer2)

      // Should call pdf-parse twice (different buffers)
      expect(pdfParse.mock.calls.length).toBe(2)

      // Texts should be different
      expect(text1).not.toBe(text2)
    })

    it('should handle empty PDF buffers', async () => {
      const buffer = Buffer.from('')
      const text = await extractTextFromPDF(buffer)

      expect(typeof text).toBe('string')
    })

    it('should handle large PDF buffers', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024) // 10MB
      const text = await extractTextFromPDF(largeBuffer)

      expect(typeof text).toBe('string')
      expect(text.length).toBeGreaterThan(0)
    })
  })

  describe('extractTextFromMultiplePDFs', () => {
    it('should extract text from multiple PDFs', async () => {
      const buffers = [
        Buffer.from('pdf-1'),
        Buffer.from('pdf-2'),
        Buffer.from('pdf-3'),
      ]

      const combinedText = await extractTextFromMultiplePDFs(buffers)

      expect(typeof combinedText).toBe('string')
      expect(combinedText.includes('---')).toBe(true) // Should contain separators
    })

    it('should process PDFs in parallel', async () => {
      const pdfParse = require('pdf-parse')
      pdfParse.mockClear()

      const buffers = Array.from({ length: 5 }, (_, i) =>
        Buffer.from(`pdf-content-${i}`)
      )

      const startTime = Date.now()
      await extractTextFromMultiplePDFs(buffers)
      const duration = Date.now() - startTime

      // Should call pdf-parse for each buffer
      expect(pdfParse.mock.calls.length).toBe(5)

      // Should complete relatively quickly (parallel processing)
      expect(duration).toBeLessThan(1000) // Less than 1 second
    })

    it('should handle empty buffer array', async () => {
      const text = await extractTextFromMultiplePDFs([])
      expect(text).toBe('')
    })

    it('should separate PDF texts with delimiters', async () => {
      const buffers = [Buffer.from('pdf-1'), Buffer.from('pdf-2')]
      const text = await extractTextFromMultiplePDFs(buffers)

      const parts = text.split('\n\n---\n\n')
      expect(parts.length).toBe(2)
    })
  })

  describe('Cache Functionality', () => {
    it('should use SHA-256 hash for cache keys', async () => {
      const buffer = Buffer.from('test-content-for-hashing')

      // Parse twice
      await extractTextFromPDF(buffer)
      await extractTextFromPDF(buffer)

      // Second call should be from cache (no additional parse)
      const pdfParse = require('pdf-parse')
      expect(pdfParse.mock.calls.length).toBe(1)
    })

    it('should handle cache for identical content in different buffers', async () => {
      const content = 'identical-pdf-content'
      const buffer1 = Buffer.from(content)
      const buffer2 = Buffer.from(content)

      const text1 = await extractTextFromPDF(buffer1)
      const text2 = await extractTextFromPDF(buffer2)

      // Same content should return same text
      expect(text1).toBe(text2)

      // Should use cache (only one parse call)
      const pdfParse = require('pdf-parse')
      expect(pdfParse.mock.calls.length).toBe(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle PDF parsing errors', async () => {
      const pdfParse = require('pdf-parse')

      // Mock parsing error
      pdfParse.mockRejectedValueOnce(new Error('Invalid PDF format'))

      const buffer = Buffer.from('invalid-pdf')

      await expect(extractTextFromPDF(buffer)).rejects.toThrow(
        'Failed to parse PDF file'
      )
    })

    it('should handle malformed PDF data', async () => {
      const pdfParse = require('pdf-parse')

      pdfParse.mockRejectedValueOnce(new Error('Corrupted PDF'))

      const buffer = Buffer.from('corrupted-pdf-data')

      await expect(extractTextFromPDF(buffer)).rejects.toThrow()
    })
  })

  describe('Performance', () => {
    it('should complete parsing within reasonable time', async () => {
      const buffer = Buffer.alloc(1024 * 1024) // 1MB

      const startTime = Date.now()
      await extractTextFromPDF(buffer)
      const duration = Date.now() - startTime

      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000)
    })

    it('should benefit from caching on repeated calls', async () => {
      const buffer = Buffer.from('repeated-pdf-content')
      const pdfParse = require('pdf-parse')

      pdfParse.mockClear()

      // First call
      const start1 = Date.now()
      await extractTextFromPDF(buffer)
      const duration1 = Date.now() - start1

      // Second call (cached)
      const start2 = Date.now()
      await extractTextFromPDF(buffer)
      const duration2 = Date.now() - start2

      // Cached call should be faster
      expect(duration2).toBeLessThanOrEqual(duration1)

      // Only one actual parse
      expect(pdfParse.mock.calls.length).toBe(1)
    })
  })
})
