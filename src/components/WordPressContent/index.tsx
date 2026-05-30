import React from 'react'

/**
 * Renders migrated WordPress block markup faithfully.
 *
 * The harvested HTML uses root-relative URLs (`/wp-content/...` for assets,
 * `/about-us` for internal links) because every asset was mirrored into
 * `public/` with its original path. On the custom domain (hclwellness.org)
 * those resolve directly. When the site is built for the GitHub Pages subpath
 * fallback (`NEXT_PUBLIC_BASE_PATH` set), we prefix the base path here — the
 * same job `assetPath()` does for component-authored assets — because raw
 * anchors/images inside `dangerouslySetInnerHTML` don't get Next.js link
 * rewriting.
 *
 * Styling comes from `src/styles/wordpress.css` (captured from the live theme),
 * imported once in the root layout.
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

export default function WordPressContent({
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
