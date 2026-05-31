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

/**
 * Reveal the inline PDF readers in migrated WordPress "File" blocks.
 *
 * WordPress renders the `<object>` preview inside a File block with `hidden`
 * plus a `data-wp-bind--hidden="!state.hasPdfPreview"` directive; its
 * Interactivity API script clears `hidden` at runtime once it confirms the
 * browser can preview PDFs. That script is **not** part of this static export,
 * so without intervention the preview stays hidden forever and visitors can
 * only download the file — never read it inline. We strip the directive and the
 * `hidden` attribute so the embed shows (the CSP allows it via
 * `object-src 'self'`). The `<object>` still degrades to its inner fallback on
 * browsers that can't render PDFs inline.
 */
function showPdfEmbeds(html: string): string {
  return html.replace(/<object\b[^>]*\bwp-block-file__embed\b[^>]*>/g, (tag) =>
    tag.replace(/\s*data-wp-bind--hidden="[^"]*"/g, '').replace(/\s+hidden(?=[\s>])/g, '')
  )
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
      dangerouslySetInnerHTML={{ __html: withBasePath(showPdfEmbeds(html)) }}
    />
  )
}
