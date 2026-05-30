import { test, expect } from '@playwright/test'
import { testConfig } from './test.config'

/**
 * Social Links Tests
 *
 * Verify the footer's social links match the site configuration
 * (Healthy Community Lifespaces links to its LinkedIn presence) and that no
 * defunct platforms are present. Expectations come from test.config.ts.
 */

test.describe('Footer Social Links', () => {
  test('should not contain Google+ social link', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('footer a[href*="plus.google.com"]')).toHaveCount(0)
    await expect(page.locator('footer a[aria-label="Google Plus"]')).toHaveCount(0)
  })

  test('should display each configured social link', async ({ page }) => {
    await page.goto('/')
    for (const link of testConfig.socialLinks) {
      const el = page.locator(`footer a[href*="${link.url}"]`)
      await expect(el.first()).toBeVisible()
      await expect(el.first()).toHaveAttribute('aria-label', link.ariaLabel)
    }
  })

  test('should expose exactly the configured number of social icons', async ({ page }) => {
    await page.goto('/')
    // The footer omits the social block entirely when no links are configured,
    // and page.locator('') would throw — handle that case explicitly.
    if (testConfig.socialLinks.length === 0) {
      await expect(page.locator('footer [aria-label="LinkedIn"]')).toHaveCount(0)
      return
    }
    const selector = testConfig.socialLinks
      .map((l) => `footer a[aria-label="${l.ariaLabel}"]`)
      .join(', ')
    await expect(page.locator(selector)).toHaveCount(testConfig.socialLinks.length)
  })
})
