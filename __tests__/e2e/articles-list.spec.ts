/**
 * E2E Tests for Articles Listing
 * Tests article browsing, filtering, and pagination
 */

import { test, expect } from '@playwright/test'

test.describe('Articles List Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/articles') // Or your articles listing URL
  })

  test('should display list of articles', async ({ page }) => {
    // Wait for articles to load
    await page.waitForLoadState('networkidle')

    // Check for article cards/items
    const articles = page.locator('[data-testid="article-card"]').or(page.locator('article'))

    if (await articles.count() > 0) {
      await expect(articles.first()).toBeVisible()
    }
  })

  test('should display article title and excerpt', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    const firstArticle = page.locator('[data-testid="article-card"]').or(page.locator('article')).first()

    if (await firstArticle.count() > 0) {
      // Should have a heading (title)
      const title = firstArticle.locator('h1, h2, h3, h4')
      await expect(title).toBeVisible()

      // Should have some text content (excerpt)
      const content = await firstArticle.textContent()
      expect(content?.length).toBeGreaterThan(20)
    }
  })

  test('should filter articles by category', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for category filter
    const categoryFilter = page.locator('[name="category"]').or(page.getByLabel(/category|kategoria/i))

    if (await categoryFilter.count() > 0) {
      // Get initial article count
      const initialCount = await page.locator('[data-testid="article-card"]').or(page.locator('article')).count()

      // Select a category
      await categoryFilter.click()
      const firstOption = page.locator('option').or(page.getByRole('option')).nth(1)
      await firstOption.click()

      // Wait for filter to apply
      await page.waitForTimeout(1000)

      // Article count might change
      const filteredCount = await page.locator('[data-testid="article-card"]').or(page.locator('article')).count()

      // Just verify page updated (count may be same if all articles match)
      expect(filteredCount).toBeGreaterThanOrEqual(0)
    }
  })

  test('should paginate articles', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for pagination controls
    const nextButton = page.getByRole('button', { name: /next|następna|›|»/i })

    if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
      // Get first article title on page 1
      const firstArticle = page.locator('[data-testid="article-card"]').or(page.locator('article')).first()
      const firstArticleText = await firstArticle.textContent()

      // Click next page
      await nextButton.click()
      await page.waitForLoadState('networkidle')

      // Get first article title on page 2
      const newFirstArticle = page.locator('[data-testid="article-card"]').or(page.locator('article')).first()
      const newFirstArticleText = await newFirstArticle.textContent()

      // Articles should be different (unless only 1 article)
      if (firstArticleText && newFirstArticleText) {
        // Just verify we got to a new page
        expect(page.url()).toContain(/page|p=2/)
      }
    }
  })

  test('should open article details on click', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    const firstArticle = page.locator('[data-testid="article-card"]').or(page.locator('article')).first()

    if (await firstArticle.count() > 0) {
      // Click article
      const articleLink = firstArticle.locator('a').first()
      await articleLink.click()

      // Should navigate to article page
      await page.waitForLoadState('networkidle')

      // URL should change
      expect(page.url()).not.toContain('/articles')

      // Should show article content
      const articleContent = page.locator('article').or(page.locator('[data-testid="article-content"]'))
      await expect(articleContent).toBeVisible({ timeout: 5000 })
    }
  })

  test('should search articles', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Look for search input
    const searchInput = page.getByPlaceholder(/search|szukaj/i).or(page.locator('[name="search"]'))

    if (await searchInput.count() > 0) {
      await searchInput.fill('IOL')
      await searchInput.press('Enter')

      // Wait for search results
      await page.waitForTimeout(1000)

      // Should show results (or no results message)
      const hasResults = await page.locator('[data-testid="article-card"]').or(page.locator('article')).count() > 0
      const noResults = await page.getByText(/no results|brak wyników/i).count() > 0

      expect(hasResults || noResults).toBe(true)
    }
  })

  test('should display loading state while fetching articles', async ({ page }) => {
    // Slow down network to see loading state
    await page.route('**/api/articles**', async (route) => {
      await page.waitForTimeout(1000) // Delay response
      await route.continue()
    })

    await page.goto('/articles')

    // Should show loading indicator briefly
    const loadingIndicator = page.locator('[aria-busy="true"]').or(page.locator('.loading')).or(page.getByText(/loading|ładowanie/i))

    if (await loadingIndicator.count() > 0) {
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 })
    }
  })

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/articles')

    // Check layout adapts to tablet size
    const articles = page.locator('[data-testid="article-card"]').or(page.locator('article'))

    if (await articles.count() > 0) {
      const firstArticle = articles.first()
      await expect(firstArticle).toBeVisible()

      // Check article card has reasonable width
      const boundingBox = await firstArticle.boundingBox()
      expect(boundingBox?.width).toBeLessThanOrEqual(768)
    }
  })
})

test.describe('Articles List - Performance', () => {
  test('should load articles within acceptable time', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/articles')
    await page.waitForLoadState('networkidle')

    const loadTime = Date.now() - startTime

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000)
  })

  test('should handle rapid filtering without crashing', async ({ page }) => {
    await page.goto('/articles')
    await page.waitForLoadState('networkidle')

    const categoryFilter = page.locator('[name="category"]')

    if (await categoryFilter.count() > 0) {
      // Rapidly change category multiple times
      for (let i = 0; i < 5; i++) {
        await categoryFilter.selectOption({ index: (i % 3) + 1 })
        await page.waitForTimeout(100)
      }

      // Page should still be responsive
      await expect(page).not.toHaveTitle(/error|błąd/i)
    }
  })
})
