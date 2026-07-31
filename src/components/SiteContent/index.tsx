import React from 'react'

/**
 * Renders the site's page/post content.
 *
 * The content is a static snapshot in `src/data/content/content.json`
 * (originally migrated from WordPress — see `migration/` — but there is **no
 * live dependency**; the site builds and serves entirely from the committed
 * snapshot). The HTML uses root-relative URLs (`/wp-content/...` for the
 * mirrored assets, `/about-us/` for internal links). When the site is built
 * for the GitHub Pages project subpath (`NEXT_PUBLIC_BASE_PATH` set), we prefix
 * the base path here — the same job `assetPath()` does for component-authored
 * assets — because raw anchors/images inside `dangerouslySetInnerHTML` don't
 * get Next.js link rewriting.
 *
 * Styling comes from `src/styles/content.css` (captured from the original
 * theme), imported once in the root layout.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || ''

/** Escape a string for safe interpolation into an HTML attribute or text node. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Make the PDFs embedded in migrated WordPress content actually readable
 * online, on every device (issue #101).
 *
 * Three separate problems are fixed here:
 *
 * 1. **The embed was hidden.** WordPress renders the `<object>` preview inside
 *    a File block with `hidden` plus a `data-wp-bind--hidden` directive; its
 *    Interactivity API script clears `hidden` at runtime. That script is not
 *    part of this static export, so the preview stayed hidden forever. We strip
 *    the directive and the attribute (the CSP allows the embed via
 *    `object-src 'self'`).
 *
 * 2. **The embed had no fallback.** WordPress emits `<object ...></object>`
 *    with an *empty* body, and `<object>` only falls back to its inner content.
 *    Browsers that refuse to render PDFs inline — every iOS browser and Android
 *    Chrome among them — therefore showed a 600px-tall blank gap. We inject a
 *    real fallback with working "open" and "download" links, so a phone shows
 *    an action instead of a void.
 *
 * 3. **There was no way to view without downloading.** The File block ships a
 *    lone "Download" button. We add a "View" button beside it that opens the
 *    PDF in a new tab, which works even where inline embedding does not.
 */
function enhancePdfEmbeds(html: string): string {
  const PDF_OBJECT = /<object\b[^>]*\btype="application\/pdf"[^>]*>/g

  // 1. Reveal the embed.
  let out = html.replace(PDF_OBJECT, (tag) =>
    tag.replace(/\s*data-wp-bind--hidden="[^"]*"/g, '').replace(/\s+hidden(?=[\s>])/g, '')
  )

  // 2. Give every empty PDF <object> a usable fallback.
  out = out.replace(
    /(<object\b[^>]*\btype="application\/pdf"[^>]*>)(\s*)(<\/object>)/g,
    (match, open: string, _ws: string, close: string) => {
      const file = (open.match(/\bdata="([^"]*)"/) || [])[1]
      if (!file) return match
      const href = esc(file)
      return `${open}<p class="pdf-embed-fallback">This browser can’t display the PDF here. <a href="${href}" target="_blank" rel="noopener noreferrer">Open it in a new tab</a> or <a href="${href}" download>download it</a>.</p>${close}`
    }
  )

  // 3. Add a "View" button next to each File block's "Download" button.
  out = out.replace(
    /<a\b[^>]*\bclass="wp-block-file__button[^"]*"[^>]*\bdownload\b[^>]*>[\s\S]*?<\/a>/g,
    (anchor) => {
      const file = (anchor.match(/\bhref="([^"]*)"/) || [])[1]
      if (!file) return anchor
      const href = esc(file)
      return `<a href="${href}" class="wp-block-file__button wp-element-button" target="_blank" rel="noopener noreferrer">View</a>${anchor}`
    }
  )

  return out
}

function withBasePath(html: string): string {
  if (!BASE) return html
  // src/href on anchors & images, and data= on <object> PDF embeds.
  let out = html.replace(/\b(src|href|data)="\/(?!\/)/g, `$1="${BASE}/`)
  out = out.replace(
    /\bsrcset="([^"]*)"/g,
    (_m, v: string) => `srcset="${v.replace(/(^|,\s*)\/(?!\/)/g, `$1${BASE}/`)}"`
  )
  return out
}

export default function SiteContent({
  html,
  className = '',
}: {
  html: string
  className?: string
}) {
  return (
    <div
      className={`wp-content entry-content is-layout-constrained ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: withBasePath(enhancePdfEmbeds(html)) }}
    />
  )
}
