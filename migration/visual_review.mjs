/**
 * Visual review of the built static site. Launches Chromium against a local
 * `serve` of ./out, screenshots key pages, and records console errors and
 * broken images (naturalWidth === 0). Not part of the app build.
 *
 *   npx serve out -l 3000 &   # then:
 *   node migration/visual_review.mjs
 */
import { chromium } from '@playwright/test'
import fs from 'fs'

const BASE = process.env.REVIEW_BASE || 'http://localhost:3000'
const OUT = '/tmp/review'
fs.mkdirSync(OUT, { recursive: true })

const PAGES = [
  ['home', '/'],
  ['about-us', '/about-us/'],
  ['team', '/team/'],
  ['our-vision', '/our-vision/'],
  ['volunteer', '/volunteer/'],
  ['training', '/training/'],
  ['contest', '/contest/'],
  ['evidenced-based-resources', '/evidenced-based-resources/'],
  ['calendar', '/calendar/'],
  ['contact-us', '/contact-us/'],
  ['blog', '/blog/'],
  ['article-diet-mental-health', '/the-role-of-diet-in-mental-health/'],
  ['micromobility', '/micromobility-information-and-resources/'],
  ['donor-dashboard', '/donor-dashboard/'],
]

const VIEWPORTS = { desktop: { width: 1280, height: 900 }, mobile: { width: 390, height: 844 } }

const report = []

const browser = await chromium.launch()
for (const [name, route] of PAGES) {
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport: vp })
    const page = await ctx.newPage()
    const consoleErrors = []
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200))
    })
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e).slice(0, 200)))
    const failedReq = []
    page.on('requestfailed', (r) => failedReq.push(r.url().slice(0, 120)))

    let status = 0
    try {
      const resp = await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 30000 })
      status = resp ? resp.status() : 0
    } catch (e) {
      consoleErrors.push('goto error: ' + String(e).slice(0, 150))
    }
    await page.waitForTimeout(500)

    const brokenImages =
      vpName === 'desktop'
        ? await page.evaluate(() =>
            Array.from(document.images)
              .filter((img) => img.complete && img.naturalWidth === 0)
              .map((img) => img.currentSrc || img.src)
          )
        : []

    const title = await page.title()
    const file = `${OUT}/${name}-${vpName}.png`
    await page.screenshot({ path: file, fullPage: vpName === 'desktop' })
    if (vpName === 'desktop') {
      report.push({ name, route, status, title, brokenImages, consoleErrors, failedReq })
    }
    await ctx.close()
  }
}
await browser.close()

fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
console.log('=== VISUAL REVIEW ===')
for (const r of report) {
  const flags = []
  if (r.status !== 200) flags.push(`HTTP ${r.status}`)
  if (r.brokenImages.length) flags.push(`${r.brokenImages.length} broken img`)
  if (r.consoleErrors.length) flags.push(`${r.consoleErrors.length} console err`)
  console.log(
    `${flags.length ? '⚠️ ' : '✓ '}${r.route}  [${r.title.slice(0, 50)}]  ${flags.join(', ')}`
  )
  for (const b of r.brokenImages.slice(0, 4)) console.log('     broken img:', b)
  for (const c of r.consoleErrors.slice(0, 3)) console.log('     console:', c)
}
