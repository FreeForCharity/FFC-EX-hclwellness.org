import React from 'react'
import { ALL_DOCUMENTS } from '@/data/documents'

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

// Map mirrored PDF path → document content-page slug, for File blocks whose PDF
// has a web-readable content page at /documents/<slug>/ (issue #59).
const SLUG_BY_PDF = new Map(ALL_DOCUMENTS.map((d) => [d.file, d.slug]))

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Replace migrated WordPress "File" blocks with a web-friendly callout.
 *
 * WordPress renders each File block as a `<object type="application/pdf">`
 * preview plus download links. That inline `<object>` viewer renders as a
 * **blank box** on browsers without a built-in PDF viewer (notably Android
 * Chrome), and depends on a WordPress Interactivity API script we don't ship.
 * So instead of embedding the PDF, we replace the whole block with a callout:
 *
 *  - If the PDF has a web-readable content page (/documents/<slug>/), link
 *    "Read online" to it plus a Download link.
 *  - Otherwise, offer Download + Open-in-new-tab.
 *
 * The block's structure is `<div class="wp-block-file"> <object…></object>
 * <a href=PDF>title</a> <a class="wp-block-file__button" download>Download</a>
 * </div>` with no nested divs, so a non-greedy match to the next `</div>` is
 * safe.
 */
function rewriteFileBlocks(html: string): string {
  return html.replace(/<div[^>]*\bclass="wp-block-file"[^>]*>([\s\S]*?)<\/div>/g, (block) => {
    const pdf = block.match(/data="([^"]+\.pdf)"/i)?.[1] ?? block.match(/href="([^"]+\.pdf)"/i)?.[1]
    if (!pdf) return block
    // Title = text of the first non-button anchor (WordPress's filename link);
    // fall back to the PDF's file name.
    const label = block
      .match(/<a(?![^>]*wp-block-file__button)[^>]*>([\s\S]*?)<\/a>/)?.[1]
      ?.replace(/<[^>]+>/g, '')
      .trim()
    const title = (
      label && label.length > 1 ? label : decodeURIComponent(pdf.split('/').pop() || 'document')
    ).trim()
    const slug = SLUG_BY_PDF.get(pdf)
    const read = slug
      ? `<a class="ffc-doc-read" href="/documents/${slug}">📄 Read online</a>`
      : `<a class="ffc-doc-read" href="${pdf}" target="_blank" rel="noopener noreferrer">📄 Open PDF ↗</a>`
    return (
      `<div class="ffc-doc-callout">` +
      `<span class="ffc-doc-title">${escapeHtml(title)}</span>` +
      `<span class="ffc-doc-actions">${read}` +
      `<a class="ffc-doc-download" href="${pdf}" download>⬇ Download PDF</a>` +
      `</span></div>`
    )
  })
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
      dangerouslySetInnerHTML={{ __html: withBasePath(rewriteFileBlocks(html)) }}
    />
  )
}
