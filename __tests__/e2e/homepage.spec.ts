/**
 * E2E Tests for Homepage
 * Tests user interactions and page functionality
 */

import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check page title
    await expect(page).toHaveTitle(/AI Medical Blog/i)

    // Check main heading
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
  })

  test('should display navigation menu', async ({ page }) => {
    await page.goto('/')

    // Check for main navigation links
    const nav = page.getByRole('navigation')
    await expect(nav).toBeVisible()

    // Common navigation items
    const homeLink = page.getByRole('link', { name: /home|strona główna/i })
    if (await homeLink.count() > 0) {
      await expect(homeLink.first()).toBeVisible()
    }
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Check if mobile menu toggle exists
    const mobileMenu = page.getByRole('button', { name: /menu/i })
    if (await mobileMenu.count() > 0) {
      await expect(mobileMenu).toBeVisible()
    }
  })

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/')

    // Check meta description
    const metaDescription = page.locator('meta[name="description"]')
    await expect(metaDescription).toHaveAttribute('content', /.+/)

    // Check meta viewport
    const metaViewport = page.locator('meta[name="viewport"]')
    await expect(metaViewport).toHaveAttribute('content', /width=device-width/)
  })
})
