import React from 'react'
import Link from 'next/link'
import { assetPath } from '@/lib/assetPath'
import type { PdfDoc } from '@/data/documents'

/**
 * A single document card: title, description, action links, and a collapsible
 * inline PDF reader.
 *
 * The reader uses a native `<object>` embed (allowed by the CSP's
 * `object-src 'self'`; an `<iframe>` would be blocked because `frame-src` does
 * not include `'self'`). It is wrapped in a native `<details>` so it expands on
 * click with no JavaScript, keeping the page light while still letting visitors
 * read the document without downloading it. On browsers that can't render PDFs
 * inline, the `<object>` falls back to its download/open links.
 */
export default function PdfDocument({ doc }: { doc: PdfDoc }) {
  const href = assetPath(doc.file)
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">{doc.title}</h3>
      {doc.description && <p className="mt-1 text-sm text-gray-600">{doc.description}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 underline hover:text-blue-900"
        >
          Open in new tab ↗
        </a>
        <a href={href} download className="text-blue-700 underline hover:text-blue-900">
          Download PDF
        </a>
        {doc.sourceRoute && (
          <Link href={doc.sourceRoute} className="text-gray-600 underline hover:text-gray-900">
            {doc.sourceLabel ? `View on “${doc.sourceLabel}”` : 'View in context'} →
          </Link>
        )}
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer select-none text-sm font-medium text-blue-700 hover:text-blue-900">
          📄 Read inline (no download)
        </summary>
        <object
          data={href}
          type="application/pdf"
          aria-label={`Embedded PDF: ${doc.title}`}
          className="mt-3 h-[600px] w-full rounded border border-gray-200"
        >
          <p className="p-4 text-sm text-gray-600">
            Your browser can’t display this PDF inline.{' '}
            <a href={href} download className="underline">
              Download it
            </a>{' '}
            or{' '}
            <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
              open it in a new tab
            </a>
            .
          </p>
        </object>
      </details>
    </article>
  )
}
