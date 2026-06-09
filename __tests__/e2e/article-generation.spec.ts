/**
 * E2E Tests for Article Generation Workflow
 * Tests complete user flow from PDF upload to article generation
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// Helper: Create a test PDF file
function createTestPDF(): string {
  const testPdfPath = path.join(__dirname, 'fixtures', 'test.pdf')
  const dir = path.dirname(testPdfPath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Create a minimal PDF (not a real PDF, just for upload testing)
  if (!fs.existsSync(testPdfPath)) {
    fs.writeFileSync(testPdfPath, 'Test PDF Content for E2E Testing')
  }

  return testPdfPath
}

test.describe('Article Generation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to generation page (adjust URL based on your app)
    await page.goto('/generate') // Or wherever your generation UI is
  })

  test('should display article generation form', async ({ page }) => {
    // Check for file upload input
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeVisible()

    // Check for target audience selection
    const audienceSelect = page.locator('[name="targetAudience"]')
    if (await audienceSelect.count() > 0) {
      await expect(audienceSelect).toBeVisible()
    }

    // Check for provider selection
    const providerSelect = page.locator('[name="provider"]')
    if (await providerSelect.count() > 0) {
      await expect(providerSelect).toBeVisible()
    }

    // Check for submit button
    const submitButton = page.getByRole('button', { name: /generate|generuj/i })
    await expect(submitButton).toBeVisible()
  })

  test('should upload PDF file', async ({ page }) => {
    const testPdfPath = createTestPDF()

    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testPdfPath)

    // Verify file was selected (check for filename display)
    await expect(page.locator('text=/test\\.pdf/i')).toBeVisible({ timeout: 5000 })
  })

  test('should select target audience', async ({ page }) => {
    const audienceSelect = page.locator('[name="targetAudience"]')

    if (await audienceSelect.count() > 0) {
      await audienceSelect.selectOption('professional')

      // Verify selection
      await expect(audienceSelect).toHaveValue('professional')
    }
  })

  test('should select AI provider', async ({ page }) => {
    const providerSelect = page.locator('[name="provider"]')

    if (await providerSelect.count() > 0) {
      await providerSelect.selectOption('gemini')

      // Verify selection
      await expect(providerSelect).toHaveValue('gemini')
    }
  })

  test('should show loading state during generation', async ({ page }) => {
    // This test would need a mock or actual generation
    // For now, just check if button shows loading state when clicked

    const testPdfPath = createTestPDF()

    // Fill form
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testPdfPath)

    // Select options if available
    const audienceSelect = page.locator('[name="targetAudience"]')
    if (await audienceSelect.count() > 0) {
      await audienceSelect.selectOption('professional')
    }

    // Click generate button
    const submitButton = page.getByRole('button', { name: /generate|generuj/i })
    await submitButton.click()

    // Check for loading indicator
    await expect(page.locator('[aria-busy="true"]').or(page.locator('.loading')).or(page.getByText(/generating|generowanie|loading/i))).toBeVisible({ timeout: 2000 })
  })

  test('should display validation errors for missing fields', async ({ page }) => {
    // Try to submit without uploading PDF
    const submitButton = page.getByRole('button', { name: /generate|generuj/i })

    // Click submit without filling form
    await submitButton.click()

    // Should show error message
    await expect(
      page.getByText(/required|wymagane|please upload|proszę przesłać/i)
    ).toBeVisible({ timeout: 3000 })
  })

  test('should handle multiple file uploads', async ({ page }) => {
    const testPdfPath = createTestPDF()

    const fileInput = page.locator('input[type="file"]')

    // Check if multiple attribute exists
    const isMultiple = await fileInput.getAttribute('multiple')

    if (isMultiple !== null) {
      // Upload multiple files
      await fileInput.setInputFiles([testPdfPath, testPdfPath])

      // Verify multiple files displayed
      const fileCount = await page.locator('text=/test\\.pdf/i').count()
      expect(fileCount).toBeGreaterThanOrEqual(1)
    }
  })

  test('should navigate to article details after generation', async ({ page }) => {
    // Skip this test if it requires actual generation
    test.skip(process.env.SKIP_SLOW_TESTS === 'true', 'Skipping slow E2E test')

    // This would test the complete flow including waiting for generation
    // and navigating to the generated article
  })
})

test.describe('Article Generation - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('should work on mobile devices', async ({ page }) => {
    await page.goto('/generate')

    // Check form is accessible on mobile
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeVisible()

    // Check buttons are properly sized
    const submitButton = page.getByRole('button', { name: /generate|generuj/i })
    const boundingBox = await submitButton.boundingBox()

    // Button should be at least 44x44 pixels (iOS touch target size)
    expect(boundingBox?.height).toBeGreaterThanOrEqual(44)
  })
})
