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

function withBasePath(html: string): string {
  if (!BASE) return html
  let out = html.replace(/\b(src|href)="\/(?!\/)/g, `$1="${BASE}/`)
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
      dangerouslySetInnerHTML={{ __html: withBasePath(html) }}
    />
  )
}
