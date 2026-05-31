/**
 * Visual parity check: live WordPress vs the deployed static site.
 *
 * For every route in compare-routes.txt, screenshots both the live WordPress
 * page and the live GitHub Pages page, writes side-by-side composites and a
 * summary (HTTP status, full-page height, broken-image count) to /tmp/compare.
 * Not part of the app build — a migration QA aid, runnable any time:
 *
 *   node migration/compare-wp-vs-static.mjs
 *
 * Env overrides: WP_BASE, GH_BASE, COMPARE_OUT.
 *
 * Note: hclwellness.org intermittently returns "Forbidden" to headless
 * browsers (Apache bot protection); those WP captures show an error banner and
 * a short page height. That's a capture artifact, not a difference in content.
 */
import { chromium } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const WP = process.env.WP_BASE || 'https://hclwellness.org'
const GH = process.env.GH_BASE || 'https://freeforcharity.github.io/FFC-EX-hclwellness.org'
const OUT = process.env.COMPARE_OUT || '/tmp/compare'
const here = path.dirname(fileURLToPath(import.meta.url))

fs.mkdirSync(OUT, { recursive: true })
const routes = fs
  .readFileSync(path.join(here, 'compare-routes.txt'), 'utf8')
  .split('\n')
  .map((r) => r.trim())
  .filter(Boolean)

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1100, height: 900 },
  ignoreHTTPSErrors: true,
})
const summary = []

async function shot(page, base, route) {
  try {
    const resp = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 35000 })
    await page.waitForTimeout(1800)
    const broken = await page.evaluate(
      () => Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).length
    )
    const h = await page.evaluate(() => document.body.scrollHeight)
    const buf = await page.screenshot({ fullPage: true })
    return { status: resp ? resp.status() : 0, broken, h, b64: buf.toString('base64') }
  } catch (e) {
    return { status: 0, broken: -1, h: 0, b64: null, err: String(e).slice(0, 60) }
  }
}

let i = 0
for (const route of routes) {
  i++
  const name =
    String(i).padStart(2, '0') +
    (route === '/' ? '-home' : route.replace(/\//g, '-').replace(/-$/, ''))
  const page = await ctx.newPage()
  const wp = await shot(page, WP, route)
  const gh = await shot(page, GH, route)
  await page.close()

  if (wp.b64 || gh.b64) {
    const comp = await ctx.newPage()
    await comp.setViewportSize({ width: 1640, height: 1000 })
    const col = (label, s) =>
      `<div style="flex:1;border:1px solid #ccc">
         <div style="font:14px sans-serif;background:#222;color:#fff;padding:6px 10px">${label} — HTTP ${s.status}${s.broken > 0 ? ` · ${s.broken} broken img` : ''}${s.err ? ' · ' + s.err : ''}</div>
         ${s.b64 ? `<img style="width:100%;display:block" src="data:image/png;base64,${s.b64}">` : '<div style="padding:40px;font:16px sans-serif;color:#a00">no screenshot</div>'}
       </div>`
    await comp.setContent(
      `<div style="font:16px sans-serif;padding:8px 10px;background:#f3f3f3"><b>${route}</b></div>
       <div style="display:flex;gap:8px;align-items:flex-start">${col('WordPress (live)', wp)}${col('GitHub Pages (static)', gh)}</div>`
    )
    await comp.waitForTimeout(300)
    await comp.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
    await comp.close()
  }
  summary.push(
    `${route} | WP ${wp.status}/${wp.h}px/${wp.broken}brk | GH ${gh.status}/${gh.h}px/${gh.broken}brk`
  )
  console.log(`[${i}/${routes.length}] ${route}  WP=${wp.status} GH=${gh.status}`)
}
await browser.close()
fs.writeFileSync(`${OUT}/summary.txt`, summary.join('\n'))
console.log(`DONE — composites + summary in ${OUT}`)
