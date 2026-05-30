import { test, expect } from '@playwright/test'
import { testConfig } from './test.config'

/**
 * Google Tag Manager (GTM) Tests
 *
 * Verify GTM integration: the script is injected, `dataLayer` initializes, the
 * noscript fallback exists, and the configured ID is used.
 *
 * The GTM <Script> uses Next.js `strategy="lazyOnload"`, so it runs after the
 * load/idle phase rather than synchronously — every test waits for the script
 * and dataLayer to be ready before asserting, otherwise the checks race the
 * loader.
 */

const GTM_READY = () =>
  typeof (window as unknown as { dataLayer?: unknown[] }).dataLayer !== 'undefined' &&
  document.getElementById('gtm-script') !== null

async function gotoAndWaitForGtm(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForFunction(GTM_READY, undefined, { timeout: 15000 })
}

test.describe('Google Tag Manager Integration', () => {
  test('should initialize dataLayer on page load', async ({ page }) => {
    await gotoAndWaitForGtm(page)
    const hasDataLayer = await page.evaluate(() => {
      const dl = (window as unknown as { dataLayer?: unknown[] }).dataLayer
      return typeof dl !== 'undefined' && Array.isArray(dl)
    })
    expect(hasDataLayer).toBe(true)
  })

  test('should load GTM script with correct ID', async ({ page }) => {
    await gotoAndWaitForGtm(page)
    const gtmScript = await page.locator('script[id="gtm-script"]').count()
    expect(gtmScript).toBeGreaterThan(0)
    const scriptContent = await page.locator('script[id="gtm-script"]').innerHTML()
    expect(scriptContent).toContain('googletagmanager.com/gtm.js')
    expect(scriptContent).toContain('dataLayer')
  })

  test('should have GTM noscript fallback in body', async ({ page }) => {
    await page.goto('/')
    const pageContent = await page.content()
    expect(pageContent).toContain('googletagmanager.com/ns.html')
    expect(pageContent).toContain('noscript')
  })

  test('should push events to dataLayer', async ({ page }) => {
    await gotoAndWaitForGtm(page)
    const canPushToDataLayer = await page.evaluate(() => {
      const dl = (window as unknown as { dataLayer?: unknown[] }).dataLayer
      if (typeof dl === 'undefined') return false
      const initialLength = dl.length
      dl.push({ event: 'test_event', test: true })
      return dl.length > initialLength
    })
    expect(canPushToDataLayer).toBe(true)
  })

  test('should expose the GTM script and dataLayer once loaded', async ({ page }) => {
    await gotoAndWaitForGtm(page)
    const gtmScript = await page.evaluate(
      () => document.querySelector('script[id="gtm-script"]') !== null
    )
    expect(gtmScript).toBe(true)
    const dataLayerInitialized = await page.evaluate(
      () => typeof (window as unknown as { dataLayer?: unknown[] }).dataLayer !== 'undefined'
    )
    expect(dataLayerInitialized).toBe(true)
  })

  test('should work with cookie consent system', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    const banner = page.locator('[role="region"][aria-label="Cookie consent notice"]')
    await expect(banner).toBeVisible()

    await page.getByRole('button', { name: testConfig.cookieConsent.buttons.acceptAll }).click()

    await page.waitForFunction(
      () => {
        const dl = (window as unknown as { dataLayer?: { event?: string }[] }).dataLayer
        return Array.isArray(dl) && dl.some((item) => item.event === 'consent_update')
      },
      undefined,
      { timeout: 15000 }
    )
  })
})

test.describe('Google Tag Manager Configuration', () => {
  test('should load GTM script with configured ID', async ({ page }) => {
    await gotoAndWaitForGtm(page)
    const gtmScript = await page.locator('script[id="gtm-script"]').count()
    expect(gtmScript).toBeGreaterThan(0)
    const scriptContent = await page.locator('script[id="gtm-script"]').innerHTML()
    expect(scriptContent).toContain(testConfig.googleTagManager.id)
  })
})
